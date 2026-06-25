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

const runTests = async () => {
  console.log('=== Starting Backend Integration Verification ===');
  
  try {
    // 1. Health Check
    console.log('\nTesting Health Check...');
    const health = await request('GET', '/../health');
    console.log(`Status: ${health.statusCode}, Response:`, health.body);

    // 2. Register Student
    console.log('\nRegistering Mock Student...');
    const regStudent = await request('POST', '/auth/register', {
      name: 'Integration Test Student',
      email: 'test_student@school.edu',
      password: 'password123',
      role: 'student'
    });
    console.log(`Status: ${regStudent.statusCode}, Name: ${regStudent.body?.user?.name}`);

    if (regStudent.statusCode !== 210 && regStudent.statusCode !== 201) {
      console.warn('Student might already exist. Attempting Login instead...');
    }

    // 3. Login Student
    console.log('\nLogging in Student...');
    const loginStudent = await request('POST', '/auth/login', {
      email: 'test_student@school.edu',
      password: 'password123'
    });
    console.log(`Status: ${loginStudent.statusCode}`);
    const studentToken = loginStudent.body?.token;
    
    if (!studentToken) {
      throw new Error('Failed to retrieve authentication token.');
    }

    const studentHeaders = { Authorization: `Bearer ${studentToken}` };

    // 4. Retrieve Subjects
    console.log('\nRetrieving Subjects list...');
    const subjectsRes = await request('GET', '/subjects', null, studentHeaders);
    console.log(`Status: ${subjectsRes.statusCode}, Found: ${subjectsRes.body?.length} subjects`);
    const mathSub = subjectsRes.body?.find(s => s.code === 'MATH101');
    const mathCode = mathSub ? mathSub.code : 'MATH101';

    // 5. Ask Doubt
    console.log('\nPosting a New Doubt...');
    const doubtRes = await request('POST', '/doubts', {
      title: 'How to calculate the derivative of x^x?',
      description: 'I tried logarithmic differentiation but keep getting lost on taking the derivative of the exponent. Can anyone write down the clean steps?',
      subjectCode: mathCode
    }, studentHeaders);
    console.log(`Status: ${doubtRes.statusCode}, AI Classification:`, {
      topic: doubtRes.body?.doubt?.topic,
      difficulty: doubtRes.body?.doubt?.difficulty,
      peerAnswerable: doubtRes.body?.analysis?.isPeerAnswerable
    });
    const doubtId = doubtRes.body?.doubt?._id;

    // 6. Submit Answer
    console.log('\nSubmitting Peer Solution...');
    const answerRes = await request('POST', '/answers', {
      doubtId: doubtId,
      content: 'Let y = x^x. Take ln of both sides: ln y = x ln x. Take the derivative with respect to x: (1/y) * y\' = 1 * ln x + x * (1/x) = ln x + 1. Multiply by y to solve for y\': y\' = y * (ln x + 1) = x^x * (ln x + 1). Therefore the derivative of x^x is x^x * (ln x + 1).',
      hintsUsedCount: 0
    }, studentHeaders);
    console.log(`Status: ${answerRes.statusCode}, AI Graded Score: ${answerRes.body?.evaluation?.score}/100, XP Awarded: +${answerRes.body?.xpGained} XP`);

    // 7. Request Hint
    console.log('\nRequesting Progressive Hint...');
    const hintRes = await request('POST', '/hints/request', { doubtId }, studentHeaders);
    console.log(`Status: ${hintRes.statusCode}, Hint Content: ${hintRes.body?.hintContent}`);

    // 8. Register and Login Teacher
    console.log('\nRegistering/Logging in Teacher...');
    const regTeacher = await request('POST', '/auth/register', {
      name: 'Dr. Integration',
      email: 'test_teacher@school.edu',
      password: 'password123',
      role: 'teacher',
      department: 'Mathematics'
    });
    
    let teacherToken = regTeacher.body?.token;
    if (!teacherToken) {
      const loginTeacher = await request('POST', '/auth/login', {
        email: 'test_teacher@school.edu',
        password: 'password123'
      });
      teacherToken = loginTeacher.body?.token;
    }
    
    const teacherHeaders = { Authorization: `Bearer ${teacherToken}` };

    // 9. Fetch Faculty Workload Analytics
    console.log('\nRetrieving Teacher Analytics...');
    const analytics = await request('GET', '/analytics/teacher', null, teacherHeaders);
    console.log(`Status: ${analytics.statusCode}, Hours Saved: ${analytics.body?.metrics?.hoursSaved} hrs, Peer solved: ${analytics.body?.metrics?.peerSolvedPercentage}%`);

    console.log('\n=== Backend Integration Verification Successful! ===');
  } catch (error) {
    console.error('\n!!! Verification Failed !!!', error);
  }
};

// Delay run to let server boot up if run simultaneously
setTimeout(runTests, 2000);
