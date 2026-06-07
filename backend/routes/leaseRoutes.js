const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { success, fail } = require('../utils/response');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT lr.id, lr.user_id, lr.house_id, lr.application_id, lr.lease_start_date, lr.lease_end_date, lr.rent_amount, lr.lease_status, lr.created_at,
              u.real_name AS user_name,
              h.house_title, h.house_address, h.house_price
       FROM lease_record lr
       LEFT JOIN sys_user u ON lr.user_id = u.id
       LEFT JOIN house h ON lr.house_id = h.id
       ORDER BY lr.id DESC`
    );

    const normalized = rows.map(row => ({
      ...row,
      rent_amount: Number(row.rent_amount) > 0
        ? Number(row.rent_amount)
        : computeRentAmount(row.house_price, row.lease_start_date, row.lease_end_date)
    }));

    success(res, normalized, '租赁记录获取成功');
  } catch (error) {
    fail(res, error.message || '租赁记录获取失败');
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { user_id, house_id, application_id, lease_start_date, lease_end_date, rent_amount } = req.body || {};
    const price = Number(rent_amount || 0);
    const computed = price > 0 ? price : computeRentAmount(0, lease_start_date, lease_end_date);
    const [result] = await pool.query(
      `INSERT INTO lease_record (user_id, house_id, application_id, lease_start_date, lease_end_date, rent_amount, lease_status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [user_id, house_id, application_id || null, lease_start_date, lease_end_date, computed]
    );
    const [rows] = await pool.query('SELECT * FROM lease_record WHERE id = ? LIMIT 1', [result.insertId]);
    success(res, rows[0], '租赁记录生成成功');
  } catch (error) {
    fail(res, error.message || '生成租赁记录失败');
  }
});

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
