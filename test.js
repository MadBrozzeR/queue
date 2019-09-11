const Queue = require('./index.js');

function test (description, assertion, expect) {
  process.stdout.write(description);
  if (assertion === expect) {
    process.stdout.write(' \033[32mOK\033[0m\n');
  } else {
    process.stdout.write(' \033[31mFAIL\033[0m\n');
    process.stderr.write('assertion (' + assertion + ') is not equal to expectation (' + expect + ')\n');
    process.exit(1);
  }
}

const elements = [
  {
    init: function (data) {
      test('No data should be passed to first element init event', data, undefined);
      const queue = this.queue;

      setTimeout(function () {
        queue.trigger('data', 'Some data');
      }, 200);
    },
    data: function (data) {
      test('Data should be passed as an argument', data, 'Some data');
      this.queue.next('Passed to next');
    }
  },
  {
    init: function (data) {
      test('Data should be passed as an argument from previous element', data, 'Passed to next');
      this.setTimeout(200, 'Timeout message');
    },
    timeout: function (message) {
      test('Timeout should be triggered with a given message', message, 'Timeout message');
      this.queue.next();
    }
  }
];

let order = 0;
const queue = new Queue.NetQueue();
const load = new Queue.LoadQueue(3, {
  init: function (params) {
    setTimeout(this.done.bind(this), params.delay);
  },
  done: function () {
    test('Should be called in order ' + this.params.order, this.params.order, ++order);
  },
  end: function () {
    test('Should be called at the end of load queue', true, true);
  }
});
queue.onEnd = function () {
  test('onEnd handler should be triggered in the end', true, true);

  load.push({order: 3, delay: 50});
  load.push({order: 1, delay: 20});
  load.push({order: 4, delay: 70});
  load.push({order: 2, delay: 20});
  load.push({order: 5, delay: 40});
}

queue.push(elements[0]);
queue.push(elements[1]);
