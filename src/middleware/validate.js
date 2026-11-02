module.exports = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    
    if (error) {
      const details = error.details.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({ status: 'error', errors: details });
    }
    
    req.body = value;
    next();
  };
};