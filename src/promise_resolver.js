"use strict";
var util = require("./util.js");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = require("./errors.js");
var TimeoutError = errors.TimeoutError;
var RejectionError = errors.RejectionError;
var async = require("./async.js");
var haveGetters = util.haveGetters;
var es5 = require("./es5.js");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

function wrapAsRejectionError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new RejectionError(obj);
    }
    else {
        ret = obj;
    }
    errors.markAsOriginatingFromRejection(ret);
    return ret;
}

function nodebackForPromise(promise) {
    function PromiseResolver$_callback(err, value) {
        if (err) {
            var wrapped = wrapAsRejectionError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        }
        else {
            if (arguments.length > 2) {
                INLINE_SLICE(args, arguments, 1);
                promise._fulfill(args);
            }
            else {
                promise._fulfill(value);
            }
        }
    }
    return PromiseResolver$_callback;
}


/**
 * Wraps a promise object and can be used to control
 * the fate of that promise. Give .promise to clients
 * and keep the resolver to yourself.
 *
 * Something like a "Deferred".
 *
 * @constructor
 */
var PromiseResolver;
if (!haveGetters) {
    PromiseResolver = function PromiseResolver(promise) {
        this.promise = promise;
        this.asCallback = nodebackForPromise(promise);
        this.callback = this.asCallback;
    };
}
else {
    PromiseResolver = function PromiseResolver(promise) {
        this.promise = promise;
    };
}
if (haveGetters) {
    var prop = {
        get: function() {
            return nodebackForPromise(this.promise);
        }
    };
    es5.defineProperty(PromiseResolver.prototype, "asCallback", prop);
    es5.defineProperty(PromiseResolver.prototype, "callback", prop);
}

PromiseResolver._nodebackForPromise = nodebackForPromise;

/**
 * @return {string}
 */
PromiseResolver.prototype.toString = function PromiseResolver$toString() {
    return "[object PromiseResolver]";
};

/**
 * Resolve the promise by fulfilling it with the
 * given value.
 *
 * @param {dynamic} value The value to fulfill the promise with.
 *
 */
PromiseResolver.prototype.resolve =
PromiseResolver.prototype.fulfill = function PromiseResolver$resolve(value) {
    var promise = this.promise;
    if (promise._tryFollow(value)) {
        return;
    }
    async.invoke(promise._fulfill, promise, value);
};

/**
 * Resolve the promise by rejecting it with the
 * given reason.
 *
 * @param {dynamic} reason The reason why the promise was rejected.
 *
 */
PromiseResolver.prototype.reject = function PromiseResolver$reject(reason) {
    var promise = this.promise;
    errors.markAsOriginatingFromRejection(reason);
    promise._attachExtraTrace(reason);
    async.invoke(promise._reject, promise, reason);
};

/**
 * Notify the listeners of the promise of progress.
 *
 * @param {dynamic} value The reason why the promise was rejected.
 *
 */
PromiseResolver.prototype.progress =
function PromiseResolver$progress(value) {
    async.invoke(this.promise._progress, this.promise, value);
};

/**
 * Cancel the promise.
 *
 */
PromiseResolver.prototype.cancel = function PromiseResolver$cancel() {
    async.invoke(this.promise.cancel, this.promise, void 0);
};

/**
 * Resolves the promise by rejecting it with the reason
 * TimeoutError
 */
PromiseResolver.prototype.timeout = function PromiseResolver$timeout() {
    this.reject(new TimeoutError("timeout"));
};

/**
 * See if the promise is resolved.
 *
 * @return {boolean}
 */
PromiseResolver.prototype.isResolved = function PromiseResolver$isResolved() {
    return this.promise.isResolved();
};

/**
 * For JSON serialization.
 *
 * @return {dynamic}
 */
PromiseResolver.prototype.toJSON = function PromiseResolver$toJSON() {
    return this.promise.toJSON();
};

module.exports = PromiseResolver;
