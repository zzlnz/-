const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { success, fail } = require('../utils/response');
const bcrypt = require('bcryptjs');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, real_name, phone, role, avatar, status, created_at, updated_at FROM sys_user ORDER BY id DESC'
    );
    success(res, rows, '获取用户列表成功');
  } catch (error) {
    fail(res, error.message || '获取用户列表失败');
  }
});

router.get('/me', async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) return fail(res, '缺少 user_id');
    const [rows] = await pool.query('SELECT id, username, real_name, phone, role, avatar, status FROM sys_user WHERE id = ? LIMIT 1', [userId]);
    if (rows.length === 0) return fail(res, '用户不存在', 404);
    success(res, rows[0], '获取当前用户信息成功');
  } catch (error) {
    fail(res, error.message || '获取用户信息失败');
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, password, real_name, phone, role = 'tenant', status = 1 } = req.body || {};
    if (!username || !password) return fail(res, '用户名和密码不能为空');
    const [exists] = await pool.query('SELECT id FROM sys_user WHERE username = ? LIMIT 1', [username]);
    if (exists.length) return fail(res, '用户名已存在');
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO sys_user (username, password, real_name, phone, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashed, real_name || username, phone || '', role, Number(status) ? 1 : 0]
    );
    const [rows] = await pool.query('SELECT id, username, real_name, phone, role, avatar, status, created_at, updated_at FROM sys_user WHERE id = ? LIMIT 1', [result.insertId]);
    success(res, rows[0], '新增用户成功');
  } catch (error) {
    fail(res, error.message || '新增用户失败');
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { username, password, real_name, phone, role = 'tenant', status = 1 } = req.body || {};
    const [oldRows] = await pool.query('SELECT id FROM sys_user WHERE id = ? LIMIT 1', [req.params.id]);
    if (!oldRows.length) return fail(res, '用户不存在', 404);
    if (username) {
      const [exists] = await pool.query('SELECT id FROM sys_user WHERE username = ? AND id <> ? LIMIT 1', [username, req.params.id]);
      if (exists.length) return fail(res, '用户名已存在');
    }
    const fields = ['username = ?', 'real_name = ?', 'phone = ?', 'role = ?', 'status = ?'];
    const params = [username, real_name || username, phone || '', role, Number(status) ? 1 : 0];
    if (password) {
      fields.splice(1, 0, 'password = ?');
      params.splice(1, 0, await bcrypt.hash(password, 10));
    }
    params.push(req.params.id);
    const [result] = await pool.query(`UPDATE sys_user SET ${fields.join(', ')} WHERE id = ?`, params);
    if (result.affectedRows === 0) return fail(res, '用户不存在', 404);
    const [rows] = await pool.query('SELECT id, username, real_name, phone, role, avatar, status, created_at, updated_at FROM sys_user WHERE id = ? LIMIT 1', [req.params.id]);
    success(res, rows[0], '编辑用户成功');
  } catch (error) {
    fail(res, error.message || '编辑用户失败');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM sys_user WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return fail(res, '用户不存在', 404);
    success(res, null, '删除用户成功');
  } catch (error) {
    fail(res, error.message || '删除用户失败');
  }
});

module.exports = router;
