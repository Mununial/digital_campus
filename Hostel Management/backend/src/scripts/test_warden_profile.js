const authService = require('../services/authService');
const userService = require('../services/userService');

async function testWardenProfile() {
  try {
    console.log('Testing Warden Profile...');
    // Warden ID is 2
    const profile = await authService.getUserProfile(2);
    console.log('Initial Warden Profile:', {
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      gender: profile.gender,
      phone: profile.phone,
      role: profile.role,
      assigned_hostels: profile.assigned_hostels
    });

    console.log('Testing updateSelfProfile with FEMALE gender, full_name, and phone...');
    const updateRes = await userService.updateSelfProfile(2, {
      full_name: 'Dr. Sunita Sharma',
      gender: 'FEMALE',
      phone: '9876543211',
      email: 'warden@hostel.com'
    });
    console.log('Update result:', updateRes);

    const updatedProfile = await authService.getUserProfile(2);
    console.log('Updated Warden Profile:', {
      id: updatedProfile.id,
      username: updatedProfile.username,
      full_name: updatedProfile.full_name,
      gender: updatedProfile.gender,
      phone: updatedProfile.phone,
      role: updatedProfile.role,
      assigned_hostels: updatedProfile.assigned_hostels
    });

    if (updatedProfile.gender !== 'FEMALE' || updatedProfile.full_name !== 'Dr. Sunita Sharma') {
      throw new Error('Profile update verification failed: expected FEMALE and Dr. Sunita Sharma');
    }

    console.log('Testing reset back to MALE...');
    await userService.updateSelfProfile(2, {
      full_name: 'Dr. Ramesh Kumar',
      gender: 'MALE',
      phone: '9876543210'
    });

    console.log('✓ All backend warden profile tests PASSED successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testWardenProfile();
