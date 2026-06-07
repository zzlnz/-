const express = require('express');
const router = express.Router();
const { success } = require('../utils/response');

router.post('/', (req, res) => {
  success(res, { url: '/uploads/placeholder.jpg' }, '上传接口待实现');
});

module.exports = router;
