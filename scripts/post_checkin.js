const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/checkin/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': 0,
  },
  timeout: 10000,
};

const req = http.request(options, (res) => {
  let data = '';
  console.log('STATUS', res.statusCode);
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (!data) {
      console.log('BODY <empty>');
    } else {
      try {
        console.log('BODY', JSON.stringify(JSON.parse(data), null, 2));
      } catch (e) {
        console.log('BODY', data);
      }
    }
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error('REQ ERROR', err.message);
  process.exit(2);
});

req.on('timeout', () => {
  console.error('REQ TIMEOUT');
  req.destroy();
  process.exit(3);
});

req.end();
