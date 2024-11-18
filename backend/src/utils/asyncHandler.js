const asyncHandler = (requestHandler) => {
  if (typeof requestHandler !== "function") {
    throw new TypeError("Expected requestHandler to be a function");
  }
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export default asyncHandler;
