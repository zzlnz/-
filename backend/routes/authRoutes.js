const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const pool = require('../config/db');
const { success, fail } = require('../utils/response');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

function toUserPayload(row) {
  return {
    id: row.id,
    username: row.username,
    real_name: row.real_name,
    phone: row.phone,
    role: row.role,
    avatar: row.avatar,
    status: row.status
  };
}

router.post('/register', async (req, res) => {
  try {
    const { username, password, real_name, phone } = req.body || {};
    if (!username || !password) return fail(res, '用户名和密码不能为空');

    const [existsRows] = await pool.query('SELECT id FROM sys_user WHERE username = ? LIMIT 1', [username]);
    if (existsRows.length > 0) return fail(res, '用户名已存在');

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO sys_user (username, password, real_name, phone, role, status) VALUES (?, ?, ?, ?, ?, 1)',
      [username, hashedPassword, real_name || username, phone || '', 'tenant']
    );

    const [rows] = await pool.query('SELECT id, username, real_name, phone, role, avatar, status FROM sys_user WHERE id = ?', [result.insertId]);
    return success(res, toUserPayload(rows[0]), '注册成功');
  } catch (error) {
    return fail(res, error.message || '注册失败');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return fail(res, '用户名和密码不能为空');

    const [rows] = await pool.query('SELECT * FROM sys_user WHERE username = ? LIMIT 1', [username]);
    if (rows.length === 0) return fail(res, '用户名或密码错误');

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password).catch(() => false) || user.password === password;
    if (!passwordMatches) return fail(res, '用户名或密码错误');
    if (Number(user.status) !== 1) return fail(res, '账号已被禁用');

    const token = jwt.sign(toUserPayload(user), JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return success(res, {
      token,
      user: toUserPayload(user)
    }, '登录成功');
  } catch (error) {
    return fail(res, error.message || '登录失败');
  }
});

router.post('/logout', (req, res) => {
  return success(res, null, '退出登录成功');
});

module.exports = router;
