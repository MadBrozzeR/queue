# mbr-queue

Simple asynchronous queue manager. Main purpose is to be used for network packet management.
But it still can solve various tasks other than that.

## NetQueue

Queue is a main instance managing all the process. All external processes communicate with this instance,
not with certain operations in queue.
When external process triggers some event, Queue instance registers it and send it to currently active operation,
which should decide how to deal whith each event type. After current operation decides whether its job is done,
it can pass control to the next operation in queue.

### NetQueue instance

NetQueue instance is an entry point and communicate interface for external processes.
Constructor doesn't accept any argument.

```
const NetQueue = require('mbr-queue').NetQueue;

const queue = new NetQueue();
```

### queue.push

```
queue.push(listeners, params?);
```

Create and add new Element instance to the end of queue. This instance is also being returned as function result.
If newly added element is an only element in queue, then it's `init` event listener is instantly being triggered.

*listeners* - list of event listeners (@see element.listeners).

*params* - set of initial operation parameters (@see element.params).

*returns* new operation (Element instance) added to the queue.

### queue.trigger

```
queue.trigger(eventType, data?);
```

Triggers event listener (defined by `eventType`) of currently active operation. `data` argument is being passed
to that listener as an argument.

*eventType* - event type to be triggered.

*data* - data that is being passed as a listener's argument.

*returns* result of event listener or `null`.

### queue.next
```
queue.next(data?);
```

Current operation is done. Move current Element instance away from queue and pass control to the next one, triggering
it's `init` event listener with `data` as an argument, if `data` was provided.

*data* - optional data that can be sent to next Element instance.

*returns* next element in queue becoming current one or `null` if there is no elements left.

### queue.clear
```
queue.clear();
```

Simply clears all elements from queue. Usually in case of an error.

*returns* queue (itself).

### queue.isEmpty

```
const isEmpty = queue.isEmpty();
```

Checks if queue is empty or not. Returns `true` or `false` accordingly.

### queue.onEnd

```
queue.onEnd = function (data) { ... };
```

Callback is being called when queue.next() is called, but there is no more elements in queue.

`data` is a parameter passed to `queue.next` method as an argument.

## Element instance

Operations in queue are Element instances.

```
const element = queue.push(listeners, params); // both arguments described in `query.push` section
```

### element.queue

Link to the element's queue to gain access to it's methods.

### element.params

Element params are set of static or dynamic data of this Element instance. Something like local storage.
Initial values can be passed as second argument to `queue.push` method, and also can be added or altered
in any event listener function.

### element.listeners

Each element in queue has it's own set of event listeners. They are being passed as first argument to
`queue.push` method. This is an object with types as keys and function callbacks as values:

```
const listeners = {
  /* Standard event types. */
  init: function (data) {
    // Initial action.
  },
  timeout: function (message) {
    // Action on timeout.
  },

  /* Custom event types. */
};
```

Two given events are standard ones: `init` event triggers at the moment previous element leaves the queue
and this element is becoming current; `timeout` event triggers when `element.setTimeout` method was set,
and timeout has expired. All other events are custom. They can be defined and triggered by your will.
In general, all events are optional. If you don't need to perform any action as `init` event (though I don't
really know why would you need it), then you can simply omit it from listener list.

When queue triggers event of some type it makes its way into correspondant listener of current Element instance,
which in its turn should decide how to deal with this event. Some data may be passed into callback as an argument,
and function context (`this`) is a link to current Element in queue. If event of some type was triggered, but
there is no listener attached to this type of event, then it will be ignored.

It's a good idea to keep each set of event listeners in separated file, as distinct operation type.

### element.setTimeout

```
element.setTimeout(delay, message?);
```

Set timeout for current operation. If given time has passed, then `timeout` event is being triggered.

At the same time only one timeout is allowed. The next timer that been set clears previous one without triggering
`timeout` event.

*delay* - time before `timeout` event is triggered, in milliseconds.

*message* - data that will be passed as an argument to `timeout` event listener.

### element.resetTimeout

```
element.resetTimeout();
```

Restart timer that was set earlier without triggering `timeout` event.

### element.clearTimeout

```
element.clearTimeout();
```

Stops current timeout without triggering `timeout` event.
Timeout is also being cleared when current element leaves it's queue.

## One 'close to real' example.

Event listeners is actualy the main structure block in all this mess. So let's start with it.

*./operation.js*

```
module.exports = {
  // This event will be triggered when element became current in its queue.
  init: function () {
    try {
      // Send some data to network socket.
      this.params.socket.write(this.params.command);
      // Set timeout for server response in case of network problems.
      this.setTimeout(5000, 'Server did not respond in time');
    } catch (error) {
      // If there was problem with writing into socket (connection interrupted), then trigger an error.
      this.queue.trigger('error', error);
    }
  },

  // Timeout will be triggered if server did not respond in time.
  timeout: function (message) {
    this.queue.trigger('error', new Error(message));
  },

  // Event to be triggered if server respond with some data.
  data: function (data) {
    this.params.data += data;

    if (/* check if data is complete */) {
      if (/* check if some part of server response points to error */) {
        this.queue.trigger('error', new Error(this.params.data));
      } else {
        this.queue.trigger('success', this.params.data);
      }
    } else {
      // Response is incomplete. Restart timer and wait for next chunk.
      this.resetTimeout();
    }
  },

  // Event triggered in case of error.
  error: function (error) {
    // Display error.
    console.error('Error occured:', error);

    // Clear queue, because process failed, and tell it that this element has done its job.
    this.queue.clear().next();
  },

  // Event triggered in case of success.
  success: function (data) {
    // Display successfull result.
    console.log('Operation success:', data);

    // Tell to queue that this element has done its job.
    this.queue.next();
  }
}
```

*./index.js*
```
const queue = new Queue();
const operation = require('./operation.js');

// Connect to desired server.
const socket = someServer.connect();

socket.on('data', function (data) {
  // Trigger `data` event listener if server respond.
  queue.trigger('data', data.toString('utf-8'));
});

socket.on('error', function (error) {
  // Trigger error if something went wrong.
  queue.trigger('error', error)
});

// Add our operations to queue.
queue.push(operation, {
  socket: socket,
  command: 'Hello world!',
  data: ''
});
queue.push(operation, {
  socket: socket,
  command: 'Bring me some tea',
  data: ''
});

```

## LoadQueue

This type of queue executes several operations in order, but not more then `queue.max` value.
For example, if you with do download some resources from remote server, but it would jam your network channel.
You can download simultaniously 5 resources only, and start new download only when previous one is finished.
This is exactly what LoadQueue for.

### LoadQueue instance

```
const LoadQueue = require('mbr-queue').LoadQueue;

const queue = new LoadQueue(maxCount, listeners);
```
