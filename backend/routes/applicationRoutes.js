const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { success, fail } = require('../utils/response');

router.get('/', async (req, res) => {
  try {
    const { status = '' } = req.query;
    const params = [];
    let where = '';
    if (status) {
      where = 'WHERE ra.apply_status = ?';
      params.push(status);
    }
    const [rows] = await pool.query(
      `SELECT ra.id, ra.user_id, ra.house_id, ra.lease_start_date, ra.lease_end_date, ra.rent_amount, ra.apply_status, ra.apply_time, ra.review_time, ra.reviewer_id, ra.reject_reason,
              u.real_name AS user_name, u.phone AS user_phone,
              h.house_title, h.house_address, h.house_price, h.house_status, h.updated_at AS house_updated_at,
              lr.lease_start_date AS active_lease_start_date, lr.lease_end_date AS active_lease_end_date, lr.rent_amount AS active_rent_amount, lr.lease_status AS lease_status, lr.created_at AS lease_created_at
       FROM rental_application ra
       LEFT JOIN sys_user u ON ra.user_id = u.id
       LEFT JOIN house h ON ra.house_id = h.id
       LEFT JOIN lease_record lr ON lr.application_id = ra.id
       ${where}
       ORDER BY ra.id DESC`,
      params
    );
    success(res, rows, '申请列表获取成功');
  } catch (error) {
    fail(res, error.message || '申请列表获取失败');
  }
});

router.get('/mine', async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) return fail(res, '缺少 user_id');

    const [rows] = await pool.query(
      `SELECT ra.id, ra.user_id, ra.house_id, ra.apply_reason, ra.lease_start_date, ra.lease_end_date, ra.rent_amount, ra.apply_status, ra.apply_time, ra.review_time, ra.reviewer_id, ra.reject_reason,
              h.house_title, h.house_address, h.house_price, h.house_image, h.house_status,
              lr.lease_start_date AS active_lease_start_date, lr.lease_end_date AS active_lease_end_date, lr.rent_amount AS active_rent_amount, lr.lease_status AS lease_status, lr.created_at AS lease_created_at
       FROM rental_application ra
       LEFT JOIN house h ON ra.house_id = h.id
       LEFT JOIN lease_record lr ON lr.application_id = ra.id
       WHERE ra.user_id = ?
       ORDER BY ra.id DESC`,
      [userId]
    );

    const normalized = rows.map(row => ({
      ...row,
      rent_amount: row.rent_amount && Number(row.rent_amount) > 0
        ? Number(row.rent_amount)
        : computeRentAmount(row.house_price, row.lease_start_date, row.lease_end_date)
    }));

    success(res, normalized, '我的申请获取成功');
  } catch (error) {
    fail(res, error.message || '获取我的申请失败');
  }
});

router.post('/', async (req, res) => {
  try {
    const { user_id, house_id, lease_start_date, lease_end_date } = req.body || {};
    if (!user_id || !house_id) return fail(res, '缺少必要参数');
    if (!lease_start_date || !lease_end_date) return fail(res, '请填写完整租期');
    if (!isValidDateRange(lease_start_date, lease_end_date)) return fail(res, '结束日期必须晚于开始日期');

    const [houseRows] = await pool.query('SELECT id, house_price, house_status FROM house WHERE id = ? LIMIT 1', [house_id]);
    if (!houseRows.length) return fail(res, '房源不存在', 404);

    const [activeLeaseRows] = await pool.query(
      `SELECT id, lease_start_date, lease_end_date
       FROM lease_record
       WHERE house_id = ? AND lease_status = 'active'
       ORDER BY id DESC LIMIT 1`,
      [house_id]
    );

    if (activeLeaseRows.length) {
      const activeLease = activeLeaseRows[0];
      return fail(res, `该房源当前已被租赁，租期为 ${formatDate(activeLease.lease_start_date)} ~ ${formatDate(activeLease.lease_end_date)}，请在到期后再申请。`);
    }

    const [pendingRows] = await pool.query(
      `SELECT id FROM rental_application
       WHERE house_id = ? AND user_id = ? AND apply_status = 'pending'
       LIMIT 1`,
      [house_id, user_id]
    );
    if (pendingRows.length) return fail(res, '你已经提交过该房源的待审核申请，请勿重复申请');

    const rent_amount = computeRentAmount(Number(houseRows[0].house_price || 0), lease_start_date, lease_end_date);
    const [result] = await pool.query(
      `INSERT INTO rental_application (user_id, house_id, lease_start_date, lease_end_date, rent_amount, apply_status, apply_time)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
      [user_id, house_id, lease_start_date, lease_end_date, rent_amount]
    );

    const [rows] = await pool.query('SELECT * FROM rental_application WHERE id = ? LIMIT 1', [result.insertId]);
    success(res, rows[0], '租房申请提交成功');
  } catch (error) {
    fail(res, error.message || '提交租房申请失败');
  }
});

router.put('/:id/approve', async (req, res) => {
  try {
    const reviewer_id = req.body?.reviewer_id || null;
    const customStartDate = req.body?.lease_start_date || null;
    const customEndDate = req.body?.lease_end_date || null;

    const [appRows0] = await pool.query('SELECT * FROM rental_application WHERE id = ? LIMIT 1', [req.params.id]);
    if (!appRows0.length) return fail(res, '申请不存在', 404);
    const application0 = appRows0[0];

    const [houseRows] = await pool.query('SELECT id, house_price, house_status FROM house WHERE id = ? LIMIT 1', [application0.house_id]);
    if (!houseRows.length) return fail(res, '房源不存在', 404);

    const [activeLeaseRows] = await pool.query(
      `SELECT id, lease_start_date, lease_end_date
       FROM lease_record
       WHERE house_id = ? AND lease_status = 'active'
       ORDER BY id DESC LIMIT 1`,
      [application0.house_id]
    );
    if (activeLeaseRows.length) return fail(res, '该房源当前已有有效租赁记录，不能重复审批');

    const startDate = customStartDate || application0.lease_start_date || null;
    const endDate = customEndDate || application0.lease_end_date || null;
    if (!isValidDateRange(startDate, endDate)) return fail(res, '申请中未填写有效租赁日期，请让租客先录入完整租期，或使用自定义租期');

    const [result] = await pool.query(
      `UPDATE rental_application
       SET apply_status = 'approved', review_time = NOW(), reviewer_id = ?
       WHERE id = ? AND apply_status = 'pending'`,
      [reviewer_id, req.params.id]
    );
    if (result.affectedRows === 0) return fail(res, '申请不存在或已审核');

    const rentAmount = application0.rent_amount && Number(application0.rent_amount) > 0
      ? Number(application0.rent_amount)
      : computeRentAmount(houseRows[0].house_price || 0, startDate, endDate);

    await pool.query(
      `INSERT INTO lease_record (user_id, house_id, application_id, lease_start_date, lease_end_date, rent_amount, lease_status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [application0.user_id, application0.house_id, application0.id, startDate, endDate, rentAmount]
    );

    await pool.query('UPDATE house SET house_status = \'rented\' WHERE id = ?', [application0.house_id]);
    success(res, application0, '申请已通过，租赁记录已生成');
  } catch (error) {
    fail(res, error.message || '审核通过失败');
  }
});

router.put('/:id/reject', async (req, res) => {
  try {
    const { reject_reason = null, reviewer_id = null } = req.body || {};
    const [result] = await pool.query(
      `UPDATE rental_application
       SET apply_status = 'rejected', review_time = NOW(), reviewer_id = ?, reject_reason = ?
       WHERE id = ? AND apply_status = 'pending'`,
      [reviewer_id, reject_reason, req.params.id]
    );
    if (result.affectedRows === 0) return fail(res, '申请不存在或已审核');
    success(res, null, '申请已拒绝');
  } catch (error) {
    fail(res, error.message || '拒绝申请失败');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [appRows] = await pool.query('SELECT id, house_id, apply_status FROM rental_application WHERE id = ? LIMIT 1', [req.params.id]);
    if (!appRows.length) return fail(res, '申请不存在', 404);
    const application = appRows[0];

    await pool.query('DELETE FROM lease_record WHERE application_id = ?', [application.id]);
    await pool.query('DELETE FROM rental_application WHERE id = ?', [application.id]);

    if (application.apply_status === 'approved') {
      const [activeLeaseRows] = await pool.query(
        `SELECT id FROM lease_record WHERE house_id = ? AND lease_status = 'active' LIMIT 1`,
        [application.house_id]
      );
      if (!activeLeaseRows.length) {
        await pool.query('UPDATE house SET house_status = \'vacant\' WHERE id = ?', [application.house_id]);
      }
    }

    success(res, null, '申请已删除');
  } catch (error) {
    fail(res, error.message || '删除申请失败');
  }
});

router.delete('/', async (req, res) => {
  try {
    const [applications] = await pool.query('SELECT id, house_id, apply_status FROM rental_application');
    if (!applications.length) return success(res, null, '没有可清空的申请记录');
    await pool.query('DELETE FROM lease_record');
    await pool.query('DELETE FROM rental_application');
    await pool.query('UPDATE house SET house_status = \'vacant\'');
    success(res, null, '所有申请记录已清空');
  } catch (error) {
    fail(res, error.message || '清空申请失败');
  }
});

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(input) {
  if (!input) return '-';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input).slice(0, 10);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isValidDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end;
}

function diffMonthsCeil(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() >= start.getDate()) months += 1;
  return Math.max(months, 1);
}

function computeRentAmount(housePrice, leaseStartDate, leaseEndDate) {
  const price = Number(housePrice) || 0;
  const months = diffMonthsCeil(leaseStartDate, leaseEndDate);
  return Number((price * months).toFixed(2));
}

module.exports = router;
