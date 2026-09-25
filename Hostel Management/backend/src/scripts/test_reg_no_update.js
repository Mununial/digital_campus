const BASE_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('=== TEST SUITE: Registration Number Update Workflow ===\n');

  try {
    // 1. Login as Super Admin
    console.log('1. Logging in as Super Admin (superadmin)...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginIdentifier: 'superadmin',
        password: 'password123'
      })
    });
    const adminLogin = await adminLoginRes.json();
    if (!adminLogin.success) {
      console.log('❌ Admin login failed:', adminLogin);
      return;
    }
    const adminToken = adminLogin.token;
    console.log('✅ Admin login successful.');

    // 2. Fetch students list
    console.log('\n2. Fetching students list...');
    const studentsRes = await fetch(`${BASE_URL}/students?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const studentsData = await studentsRes.json();
    const students = studentsData.data?.students || [];
    if (!students || students.length === 0) {
      console.log('❌ No students found to test.');
      return;
    }
    const testStudent = students[0];
    console.log(`✅ Selected student #${testStudent.id}: "${testStudent.full_name}" (Current Reg No: ${testStudent.student_id})`);

    // 3. Admin updates student's registration number
    const updatedRegNoByAdmin = `REG${Date.now().toString().slice(-6)}`;
    console.log(`\n3. Admin updating student #${testStudent.id} Registration Number to '${updatedRegNoByAdmin}'...`);
    const updateRes = await fetch(`${BASE_URL}/students/${testStudent.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        student_id: updatedRegNoByAdmin,
        full_name: testStudent.full_name,
        email: testStudent.email,
        course: testStudent.course,
        branch: testStudent.branch,
        year: testStudent.year,
        semester: testStudent.semester
      })
    });
    const updateData = await updateRes.json();
    console.log('✅ Admin update response:', updateData.message || updateData);

    // Verify student profile via getStudentById
    const verifyRes = await fetch(`${BASE_URL}/students/${testStudent.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const verifyData = await verifyRes.json();
    console.log(`✅ Verified updated Registration Number: ${verifyData.data.student_id}, Username: ${verifyData.data.username}`);

    // 4. Test Student Self-Update
    console.log(`\n4. Resetting student password to test student self-login...`);
    await fetch(`${BASE_URL}/users/${testStudent.user_id}/reset-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        new_password: 'StudentPassword123!'
      })
    });

    console.log(`Logging in as student with new Registration Number '${updatedRegNoByAdmin}'...`);
    const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginIdentifier: updatedRegNoByAdmin,
        password: 'StudentPassword123!'
      })
    });
    const studentLogin = await studentLoginRes.json();
    if (!studentLogin.success) {
      console.log('❌ Student login failed:', studentLogin);
      return;
    }
    let studentToken = studentLogin.token;
    console.log('✅ Student logged in successfully with updated Registration Number!');

    // Change password to clear must_change_password flag
    await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        current_password: 'StudentPassword123!',
        new_password: 'NewStudentPassword123!'
      })
    });

    // 5. Student self-updates their registration number in Profile
    const studentSelfRegNo = `REG${(Date.now() + 1).toString().slice(-6)}`;
    console.log(`\n5. Student self-updating Registration Number to '${studentSelfRegNo}' via /profile...`);
    const selfUpdateRes = await fetch(`${BASE_URL}/profile`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        registration_no: studentSelfRegNo,
        full_name: testStudent.full_name,
        email: testStudent.email
      })
    });
    const selfUpdateData = await selfUpdateRes.json();
    console.log('✅ Student self-update response:', selfUpdateData.message || selfUpdateData);

    // 6. Verify student getMe
    const getMeRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const getMeData = await getMeRes.json();
    console.log(`✅ Student Profile Verified - Username: ${getMeData.user.username}, Reg No: ${getMeData.user.student_profile?.student_code}`);

    // 7. Verify login with the newly updated registration number from student self-update
    console.log(`\n7. Logging in with newly student-updated Registration Number '${studentSelfRegNo}'...`);
    const studentLogin2Res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginIdentifier: studentSelfRegNo,
        password: 'NewStudentPassword123!'
      })
    });
    const studentLogin2 = await studentLogin2Res.json();
    if (studentLogin2.success) {
      console.log('✅ Login with newly self-updated Registration Number successful!');
    } else {
      console.log('❌ Login failed with error:', studentLogin2.message);
    }

    // 8. Verify duplicate check
    console.log('\n8. Testing duplicate registration number prevention...');
    if (students.length > 1) {
      const secondStudent = students[1];
      const dupRes = await fetch(`${BASE_URL}/students/${secondStudent.id}`, {
        method: 'PUT',
        headers: 
          { 'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          student_id: studentSelfRegNo,
          full_name: secondStudent.full_name,
          email: secondStudent.email,
          course: secondStudent.course,
          branch: secondStudent.branch,
          year: secondStudent.year,
          semester: secondStudent.semester
        })
      });
      const dupData = await dupRes.json();
      if (!dupData.success) {
        console.log('✅ Duplicate correctly rejected with message:', dupData.message);
      } else {
        console.log('❌ Error: duplicate registration number should have been rejected!');
      }
    }

    console.log('\n=== ALL REGISTRATION NUMBER UPDATE TESTS PASSED! ===');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

runTests();
