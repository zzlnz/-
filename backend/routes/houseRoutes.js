const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { success, fail } = require('../utils/response');

router.get('/', async (req, res) => {
  try {
    const { keyword = '' } = req.query;
    const likeKeyword = `%${keyword}%`;
    const [rows] = await pool.query(
      `SELECT id, house_title, house_address, house_area, house_price, house_type, house_floor, house_direction, house_status, house_desc, house_image, owner_id, created_at, updated_at
       FROM house
       WHERE house_title LIKE ? OR house_address LIKE ? OR house_type LIKE ?
       ORDER BY id DESC`,
      [likeKeyword, likeKeyword, likeKeyword]
    );
    success(res, rows, '获取房源列表成功');
  } catch (error) {
    fail(res, error.message || '获取房源列表失败');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, house_title, house_address, house_area, house_price, house_type, house_floor, house_direction, house_status, house_desc, house_image, owner_id, created_at, updated_at FROM house WHERE id = ? LIMIT 1',
      [req.params.id]
    );
    if (rows.length === 0) return fail(res, '房源不存在', 404);

    const [leaseRows] = await pool.query(
      `SELECT id, user_id, house_id, application_id, lease_start_date, lease_end_date, rent_amount, lease_status, created_at
       FROM lease_record
       WHERE house_id = ? AND lease_status = 'active'
       ORDER BY id DESC LIMIT 1`,
      [req.params.id]
    );

    success(res, {
      ...rows[0],
      current_lease: leaseRows[0] || null
    }, '获取房源详情成功');
  } catch (error) {
    fail(res, error.message || '获取房源详情失败');
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO house
      (house_title, house_address, house_area, house_price, house_type, house_floor, house_direction, house_status, house_desc, house_image, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      payload.house_title,
      payload.house_address,
      payload.house_area || 0,
      payload.house_price || 0,
      payload.house_type || null,
      payload.house_floor || null,
      payload.house_direction || null,
      payload.house_status || 'vacant',
      payload.house_desc || null,
      payload.house_image || null,
      payload.owner_id || null
    ];
    const [result] = await pool.query(sql, params);
    const [rows] = await pool.query('SELECT * FROM house WHERE id = ? LIMIT 1', [result.insertId]);
    success(res, rows[0], '新增房源成功');
  } catch (error) {
    fail(res, error.message || '新增房源失败');
  }
});

router.put('/:id', async (req, res) => {
  try {
    const payload = req.body || {};
    const sql = `UPDATE house SET
      house_title = ?, house_address = ?, house_area = ?, house_price = ?, house_type = ?, house_floor = ?,
      house_direction = ?, house_status = ?, house_desc = ?, house_image = ?, owner_id = ?
      WHERE id = ?`;
    const params = [
      payload.house_title,
      payload.house_address,
      payload.house_area || 0,
      payload.house_price || 0,
      payload.house_type || null,
      payload.house_floor || null,
      payload.house_direction || null,
      payload.house_status || 'vacant',
      payload.house_desc || null,
      payload.house_image || null,
      payload.owner_id || null,
      req.params.id
    ];
    const [result] = await pool.query(sql, params);
    if (result.affectedRows === 0) return fail(res, '房源不存在', 404);
    const [rows] = await pool.query('SELECT * FROM house WHERE id = ? LIMIT 1', [req.params.id]);
    success(res, rows[0], '编辑房源成功');
  } catch (error) {
    fail(res, error.message || '编辑房源失败');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM house WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return fail(res, '房源不存在', 404);
    success(res, null, '删除房源成功');
  } catch (error) {
    fail(res, error.message || '删除房源失败');
  }
});

module.exports = router;
