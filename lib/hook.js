exports.Hook = Hook;

/*
  Class: Hook

  Standard wrapper for hook functions

  Requiring:

    > var Hook= require('nodespec/lib/hook').Hook;

  In general a Hook should not be instantiated directly, and instead
  created via <Nodespec.before>, <Nodespec.after>, <ExampleGroup.before> or
  <ExampleGroup.after>.
*/

/*
  Constructor: Hook

  Arguments:

    options   - {options} See below
    block     - {function} The hook definition, can be prodcedural or
                 asynchronous. See <nodespec.before>.

    options.collection - The collection to append the new hook to
    options.nodespec   - The top-level <nodespec> function
    options.timeout    - {nunber} seconds before assuming spec has stalled
*/
function Hook(options, block) {
  this.options = options;
  this.nodespec = options.nodespec;
  delete options.nodespec;
  this.timeout = options.timeout || this.nodespec.DEFAULT_HOOK_TIMEOUT;
  this.block = block;

  if (this.options.collection.push) {
    this.options.collection.push(this);
  }
}

/*
  Method: timeout_after

  Modify the execution timeout

  Arguments:

    seconds - {number} New timeout value
*/
Hook.prototype.timeout_after = function timeout_after(time) {
  this.timeout = time;
}
