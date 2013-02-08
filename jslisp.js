/**
 * @fileoverview
 * Sample LISP implementation in JavaScript.
 * (C) 2006 Valentin A. Alexeev <valentin.alekseev@gmail.com>
 */

/**
 * Base class for JavaScript pseudo-LISP interpreter.
 */
function JSLisp (parentInterp) {
  this.NIL = null;
  this.T = true;
  this.parentInterp = parentInterp;
  /** Operations defined in this interpreter. */
  this.operations = new JSLispOperations(this);
  /**
   * Evaluate pseudo-LISP JSON-packed source.
   * @param source source list to evaluate.
   */
  this.eval = function JSLisp_eval (source) {
      if (source == this.NIL) {
        return source;
      }
      if (source.length == null || typeof source == "string") {
        // if it's a symbol -- return it's value.
        if (this.hasVariable(source)) {
          return this.getVariable(source);
        }
        // scalar value evalute to themselves.
        return source;
      } else if (source.length > 0) {
        // non-empty array treated as function with arguments
        var operation = source[0];
        source.shift();
        // lookup function, invoke it and return result
        //  with a given set of arguments.
        if (operation.length != null && operation[0] == "lambda") {
        }
        return (this.operations.lookup(operation))(source);
      } else {
        // empty arrays translates to NIL.
        return JSLisp.NIL;
      }
  }
  
  /** A set of runtime defined named lists. */
  this.variables = {};
  
  /** Return true in case we have given named symbol. */
  this.hasVariable = function (name) {
    var result = this.variables[name] == undefined;
    if (result) {
      return JSLisp.T;
    }
    if (this.parentInterp != null) {
      return this.parentInterp.hasVariable(name);
    }
    return JSLisp.NIL;
  }
  
  /** Return value of a given symbol. Or null if it doesn't exist. */
  this.getVariable = function (name) {
    if (this.variables[name] != null) {
      return this.variables[name];
    } else if (this.parentInterp != null) {
      return this.parentInterp.getVariable(name);
    }
    return JSLisp.NIL;
  }
  
  /** Bind symbol. 
   * @param name symbol to bind to
   * @param value value to bind
   */
  this.setVariable = function (name, value) {
    if (this.parentInterp != null) {
      this.parentInterp.setVariable(name, value);
    } else {
      this.variables[name] = value;
    }
  }
}

/**
 * A helper class that holds all operations allowed by interpreter.
 * @constructor
 * @param interp an execution context.
 */
function JSLispOperations (interp) {
  /** A map for operations supported. */
  this.operations = {};
  /** Return scalar which is a result of sum of evaluated arguments. */
  this.operations_sum = function (args) {
    var result = 0;
    var itResult;
    for (var i = 0; i < args.length; i++) {
      itResult = interp.eval(args[i]);
      if (typeof itResult == "number") {
        result += itResult;
      } else  {
        throw new JSLispInvalidResultError("+ argument evaluated to non-number");
      }
    }
    return result;
  };
  
  /** Interpret args and return head of the list. 
   * Takes only 1 argument. Returns null if no head or wrong args.
   */
  this.operations_car = function (args) {
    if (args.length != 1) {
      throw new JSLispInvalidArgumentError("CAR requires single argument.");
    }
    var result = interp.eval(args[0]);
    if (result.length == null) {
      throw new JSLispInvalidResultError("CAR argument evaluated to non-list.");
    }
    if (result.length == 0) {
      return JSLisp.NIL;
    }
    return result[0];
  };
  
  /** Evaluate first argument and return tail of result list. */
  this.operations_cdr = function (args) {
    if (args.length != 1) {
      throw new JSLispInvalidArgumentError("CDR requires single argument.");
    }
    // evaluate first argument
    var result = interp.eval(args.shift());
    // throw list head away
    result.shift();
    if (result.length == null) {
      throw new JSLispInvalidResultError("CDR argument evaluated to non-list.");
    }
    if (result.length == 0) {
      return JSLisp.NIL;
    }
    // return
    return result;
  };
  
  /** A quotation operation -- returns it's arguments intact. */
  this.operations_quote = function (args) {
    if (args.length != 1) {
      throw new JSLispInvalidArgumentError("QUOTE requires single argument");
    }
    return args[0];
  };

  /** CONStruct a list. */
  this.operations_cons = function (args) {
    var result = [];
    if (args.length != 2) {
      throw new JSLispInvalidArgumentError("CONS requires two arguments.");
    }
    result.push(args.shift());
    result.push(interp.eval(args.shift()));
    return result;
  }

  /** Conditional operator. */
  this.operations_if = function (args) {
    var result;
    if (args.length != 3) {
      throw new JSLispInvalidArgumentError("IF requires three arguments.");
    }
    // evaluate and check condition
    if (interp.eval(args.shift()) == JSLisp.NIL) {
      args.shift();
      // eval and return third argument
      return interp.eval(args.shift());
    } else {
      // evaluate second argument
      return interp.eval(args.shift());
    }
  }

  /** SET a variable. */
  this.operations_set = function (args) {
    if (args.length != 2) {
      throw new JSLispInvalidArgumentError("SET requires two arguments.");
    }
    var name = interp.eval(args.shift());
    var value = interp.eval(args.shift());
    interp.setVariable(name, value);
    return value;
  }

  /** EQUAL operation. */
  this.operations_equal = function (args) {
    /** Check equivalence of two LISP constructs. */
    function checkEquals(first, second) {
      if (first == second) {
        return JSLisp.T;
      }
      if (typeof first != typeof second) {
        return JSLisp.NIL;
      }
      if (typeof first == "string") {
        return (first == second ? JSLisp.T : JSLisp.NIL);
      }
      if (first.length != null) {
        if (first.length != second.length) {
          return JSLisp.NIL;
        }
        for (var i = first.length; i != 0; i--) {
          if (checkEquals(first[i], second[i]) != JSLisp.T) {
            return JSLisp.NIL;
          }
        }
      }
    }
    if (args.length != 2) {
      throw new JSLispInvalidArgumentError("EQUAL requires two arguments.");
    }
    var first = interp.eval(args.shift());
    var second = interp.eval(args.shift());
    return checkEquals(first, second);
  }

  this.operations_lambda = function (args) {
    if (args.length == 0) {
      throw new JSLispInvalidArgumentError("LAMBDA requires at least 1 argument.");
    }
    var lambdaArgs = args.shift();
    var lambdaCode = args.shift();
    return new JSLispLambdaExpression(interp, lambdaArgs, lambdaCode);
  }
  
  // register operations
  this.operations["+"] = this.operations_sum;
  this.operations["car"] = this.operations_car;
  this.operations["cdr"] = this.operations_cdr;
  this.operations["quote"] = this.operations_quote;
  this.operations["cons"] = this.operations_cons;
  this.operations["if"] = this.operations_if;
  this.operations["set"] = this.operations_set;
  this.operations["equal"] = this.operations_equal;
  
  /** A map of function aliases. */
  this.aliases = {};
  this.aliases["first"] = "car";
  this.aliases["'"] = "quote";
  
  /** Lookup a function with a given name. */
  this.lookup = function (name) {
    if (this.operations[name] != undefined) {
      return this.operations[name];
    } else if (this.aliases[name] != undefined) {
      return this.operations[this.aliases[name]];
    }
    throw new JSLispUndefinedOperationError(name);
  }
}

/**
 * A lambda expression wrapper. Implemented via nested JSLisp interpreter.
 * @constructor
 * @param interp parent interpreter for execution context
 * @param lambdaArgs list of arguments
 * @param lambdaCode code to run
 */
function JSLispLambdaExpression(interp, lambdaArgs, lambdaCode) {
  this.eval = function (args) {
    if (args.length != lambdaArgs.length) {
      throw new JSLispInvalidArgumentError("LAMBDA parameter count missmatch: require " + lambdaArgs.length);
    }
    // create nested interpreter that inherits current context
    var nestedInterp = new JSLisp(interp);
    // setup context
    //   use direct assigment because setVariable always modifies parent context if it exists.
    for (var i = 0; i < args.length; i++) {
      nestedInterp.variables[lambdaArgs[i]] = args[i];
    }
    return nestedInterp.eval(lambdaCode);
  }
}

function JSLispInvalidArgumentError (message) {
  this.toString = function () {
    return "JSLispInvalidArgumentError: " + message;
  }
}

function JSLispInvalidResultError (message) {
  this.toString = function () {
    return "JSLispInvalidResultError: " + message;
  }
}

function JSLispUndefinedOperationError (message) {
  this.toString = function () {
    return "JSLispUndefinedOperationError: " + message;
  }
}
