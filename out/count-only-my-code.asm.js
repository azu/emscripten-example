Module["asm"] = (function(global, env, buffer) {
 "almost asm";
 var memoryBase = env.memoryBase | 0;
 var STACKTOP = 0, STACK_MAX = 0;
 var Math_fround = global.Math.fround;
 var abortStackOverflow = env.abortStackOverflow;
 const f0 = Math_fround(0);
 function _add($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
  sp = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  if ((STACKTOP | 0) >= (STACK_MAX | 0)) abortStackOverflow(16 | 0);
  $2 = $0;
  $3 = $1;
  $4 = $2;
  $5 = $3;
  $6 = $4 + $5 | 0;
  STACKTOP = sp;
  return $6 | 0;
 }
 function runPostSets() {
  var temp = 0;
 }
 function __post_instantiate() {
  STACKTOP = memoryBase + 0 | 0;
  STACK_MAX = STACKTOP + 5242880 | 0;
  runPostSets();
 }
 return {
  _add: _add,
  __post_instantiate: __post_instantiate
 };
});



