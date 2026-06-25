const http = require('http');

const API_PORT = process.env.PORT || 5000;
const HOST = 'localhost';

const request = (method, path, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: HOST,
      port: API_PORT,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: responseData ? JSON.parse(responseData) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: responseData
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(data);
    }
    req.end();
  });
};

const runAiTests = async () => {
  console.log('=== Starting Backend AI Endpoints Verification ===');
  
  try {
    // 1. Login Student to get token
    console.log('\nLogging in Student...');
    const loginStudent = await request('POST', '/auth/login', {
      email: 'alex@school.edu',
      password: 'password123'
    });
    const token = loginStudent.body?.token;
    if (!token) throw new Error('Auth failed');
    const headers = { Authorization: `Bearer ${token}` };

    // 2. Fetch a seeded doubt ID
    console.log('\nFetching seeded doubts...');
    const doubts = await request('GET', '/doubts', null, headers);
    const doubt = doubts.body?.[0];
    if (!doubt) throw new Error('No doubts found in DB');
    const doubtId = doubt._id;

    // 3. Test POST /api/ai/analyze-doubt
    console.log('\nTesting POST /api/ai/analyze-doubt...');
    const analyze = await request('POST', '/ai/analyze-doubt', {
      title: 'Thermodynamics Carnot Cycle efficiency calculation',
      description: 'How to prove that the efficiency of a Carnot cycle depends only on the temperature limits of the heat reservoirs?'
    }, headers);
    console.log('Status:', analyze.statusCode, 'Analysis:', analyze.body);

    // 4. Test POST /api/ai/generate-hint
    console.log('\nTesting POST /api/ai/generate-hint...');
    const hint = await request('POST', '/ai/generate-hint', {
      doubtId,
      ladderIndex: 1
    }, headers);
    console.log('Status:', hint.statusCode, 'Hint:', hint.body);

    // 5. Test POST /api/ai/evaluate-answer
    console.log('\nTesting POST /api/ai/evaluate-answer...');
    const evaluate = await request('POST', '/ai/evaluate-answer', {
      doubtId,
      answerContent: 'We calculate efficiency using the formula: eta = 1 - Tc/Th. In a Carnot cycle, the heat values absorbed and rejected are proportional to temperature reservoir limits.'
    }, headers);
    console.log('Status:', evaluate.statusCode, 'Evaluation:', evaluate.body);

    // 6. Test POST /api/ai/referee
    console.log('\nTesting POST /api/ai/referee...');
    const referee = await request('POST', '/ai/referee', { doubtId }, headers);
    console.log('Status:', referee.statusCode, 'Referee Report:', referee.body);

    // 7. Test POST /api/ai/escalate
    console.log('\nTesting POST /api/ai/escalate...');
    const escalate = await request('POST', '/ai/escalate', {
      doubtId,
      reason: 'low-confidence'
    }, headers);
    console.log('Status:', escalate.statusCode, 'Escalation Record:', escalate.body);

    console.log('\n=== Backend AI Endpoints Verification Successful! ===');
  } catch (error) {
    console.error('\n!!! AI Endpoints Verification Failed !!!', error);
  }
};

runAiTests();
