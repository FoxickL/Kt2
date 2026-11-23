module.exports = schema => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true, convert: true });
  if (error) return res.status(400).json({ status: 'error', message: 'Ошибка валидации', details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })) });
  req.body = value;
  next();
};
