logs2indexeddb
==============

Utility that saves all javascript console logs into the IndexedDB database continuously.
You can access console.* logs after the browser tab was closed.
This utility is a good choise for developers that need to analyze web client logs after a time.

## Install

`npm install logs2indexddb`

## Example:

```javascript
l2i.on()
    .then(() => {
      console.log('one one')
      console.info('two')
      console.warn('three')
      console.error('four')
    });
    
// ...
console.log('5');
console.log('6');
```

## How to check that it works:

Open test/console2db.html and look through the code and comments on the page. Also look into Javascript Console for errors (if occur).

## Check logs after a while:

To download a file with all logs from the database:

    l2i.download();

To download a file with logs created today:

    l2i.downloadToday();

To download logs for the given period use:

    l2i.download(fromDate, toDate);

You can invoke it right from Javascript Console or attach to a button click event handler.

To clear old logs in the database:

    l2i.clear();
