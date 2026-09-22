const path = require('node:path');
const root = path.resolve(__dirname, '../uploads');
module.exports = (req, res, next) => {
  try {
    const relative = path.relative(root, path.resolve(root, '.' + decodeURIComponent(req.path))).toLowerCase();
    if (relative === 'announcements' || relative.startsWith('announcements' + path.sep)) return res.status(404).end();
    next();
  } catch { res.status(400).end(); }
};
