const request = require('supertest');
const app = require('../backend/src/app');
const db = require('../backend/src/config/db');

describe('PHASE 17 — MASTER DATA MANAGEMENT & DATA INTEGRITY CENTER TEST SUITE', () => {

  let superAdminCookie;
  let superintendentCookie;
  let studentCookie;

  beforeAll(async () => {
    // Authenticate Super Admin
    const superAdminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'superadmin@example.com', password: 'Password123!' });
    
    if (superAdminRes.headers['set-cookie']) {
      superAdminCookie = superAdminRes.headers['set-cookie'];
    }

    // Authenticate Superintendent
    const superRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'warden@example.com', password: 'Password123!' });
    
    if (superRes.headers['set-cookie']) {
      superintendentCookie = superRes.headers['set-cookie'];
    }

    // Authenticate Student
    const studentRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'Password123!' });
    
    if (studentRes.headers['set-cookie']) {
      studentCookie = studentRes.headers['set-cookie'];
    }
  });

  describe('1. Master Data Overview & Summary API', () => {
    it('GET /api/master/summary — should return master metrics summary for Super Admin', async () => {
      const res = await request(app)
        .get('/api/master/summary')
        .set('Cookie', superAdminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('hostels');
      expect(res.body.data).toHaveProperty('floors');
      expect(res.body.data).toHaveProperty('rooms');
      expect(res.body.data).toHaveProperty('beds');
      expect(res.body.data).toHaveProperty('occupancy_rate');
    });
  });

  describe('2. Hostels Administration & Safety Guards', () => {
    let createdHostelId;

    it('POST /api/hostels — Super Admin creates a new hostel', async () => {
      const res = await request(app)
        .post('/api/hostels')
        .set('Cookie', superAdminCookie)
        .send({
          name: 'Test Phase17 Hostel',
          code: 'TP17',
          type: 'BOYS',
          capacity: 50,
          address: 'Phase 17 Campus Road'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      createdHostelId = res.body.data.id;
    });

    it('GET /api/hostels — should list hostels with pagination and search', async () => {
      const res = await request(app)
        .get('/api/hostels?search=Phase17&page=1&limit=10')
        .set('Cookie', superAdminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('PUT /api/hostels/:id — should prevent deactivating hostel with active dependencies', async () => {
      // Trying to deactivate hostel ID 1 which has active floors/students/allocations
      const res = await request(app)
        .put('/api/hostels/1')
        .set('Cookie', superAdminCookie)
        .send({
          name: 'BEC Boys Hostel 1',
          code: 'MBH',
          type: 'BOYS',
          capacity: 100,
          status: 'INACTIVE'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot deactivate hostel/i);
    });

    it('DELETE /api/hostels/:id — should prevent deleting hostel with active dependencies', async () => {
      const res = await request(app)
        .delete('/api/hostels/1')
        .set('Cookie', superAdminCookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot deactivate hostel|active/i);
    });
  });

  describe('3. Floor Management', () => {
    let createdFloorId;

    it('POST /api/floors — Super Admin creates a floor', async () => {
      const res = await request(app)
        .post('/api/floors')
        .set('Cookie', superAdminCookie)
        .send({
          hostel_id: 1,
          floor_name: 'Phase 17 Ground Floor',
          floor_number: 99,
          status: 'ACTIVE'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      createdFloorId = res.body.data.id;
    });

    it('GET /api/floors — retrieves paginated floors list', async () => {
      const res = await request(app)
        .get('/api/floors?hostel_id=1&page=1&limit=10')
        .set('Cookie', superAdminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('data');
    });

    it('PUT /api/floors/:id — should update floor details', async () => {
      if (!createdFloorId) return;
      const res = await request(app)
        .put(`/api/floors/${createdFloorId}`)
        .set('Cookie', superAdminCookie)
        .send({
          floor_name: 'Phase 17 Updated Floor',
          floor_number: 99,
          status: 'ACTIVE'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.floor_name).toBe('Phase 17 Updated Floor');
    });
  });

  describe('4. Room Management & Capacity Constraints', () => {
    let createdRoomId;

    it('POST /api/rooms — Super Admin creates a room', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Cookie', superAdminCookie)
        .send({
          hostel_id: 1,
          floor_id: 1,
          room_number: 'P17-101',
          capacity: 4,
          status: 'ACTIVE'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.room_number).toBe('P17-101');
      createdRoomId = res.body.data.id;
    });

    it('GET /api/rooms — retrieves paginated rooms list', async () => {
      const res = await request(app)
        .get('/api/rooms?hostel_id=1&page=1&limit=10')
        .set('Cookie', superAdminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('data');
    });

    it('PUT /api/rooms/:id — prevents deactivating room with active beds/students', async () => {
      // Room 1 has active beds & students
      const res = await request(app)
        .put('/api/rooms/1')
        .set('Cookie', superAdminCookie)
        .send({
          hostel_id: 1,
          floor_id: 1,
          room_number: '101',
          capacity: 2,
          status: 'INACTIVE'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot deactivate room/i);
    });
  });

  describe('5. Bed Management & Occupancy Safety', () => {
    let createdBedId;

    it('POST /api/beds — Super Admin creates a bed', async () => {
      const res = await request(app)
        .post('/api/beds')
        .set('Cookie', superAdminCookie)
        .send({
          room_id: 1,
          bed_number: 'B-P17',
          status: 'AVAILABLE'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bed_number).toBe('B-P17');
      createdBedId = res.body.data.id;
    });

    it('GET /api/beds — retrieves paginated beds list', async () => {
      const res = await request(app)
        .get('/api/beds?room_id=1&page=1&limit=10')
        .set('Cookie', superAdminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('data');
    });

    it('PUT /api/beds/:id — prevents modifying an occupied bed to AVAILABLE/INACTIVE', async () => {
      // Bed 1 is OCCUPIED
      const res = await request(app)
        .put('/api/beds/1')
        .set('Cookie', superAdminCookie)
        .send({
          bed_number: 'B1',
          status: 'AVAILABLE'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Bed cannot be modified while occupied/i);
    });

    it('DELETE /api/beds/:id — prevents deleting an occupied bed', async () => {
      const res = await request(app)
        .delete('/api/beds/1')
        .set('Cookie', superAdminCookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Bed cannot be modified while occupied/i);
    });
  });

  describe('6. Data Integrity Diagnostic Engine', () => {
    it('GET /api/master/data-integrity — Super Admin runs integrity check', async () => {
      const res = await request(app)
        .get('/api/master/data-integrity')
        .set('Cookie', superAdminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('checked_at');
      expect(res.body.data).toHaveProperty('total_issues');
      expect(res.body.data).toHaveProperty('critical_count');
      expect(res.body.data).toHaveProperty('warning_count');
      expect(res.body.data).toHaveProperty('info_count');
      expect(Array.isArray(res.body.data.issues)).toBe(true);
    });

    it('POST /api/master/data-integrity/repair — rejects invalid repair request', async () => {
      const res = await request(app)
        .post('/api/master/data-integrity/repair')
        .set('Cookie', superAdminCookie)
        .send({
          issue_type: 'INVALID_ISSUE_TYPE',
          entity_id: 999
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not supported/i);
    });
  });

  describe('7. Role-Based Access Control (RBAC)', () => {
    it('POST /api/hostels — denies access to non-SuperAdmin user', async () => {
      const res = await request(app)
        .post('/api/hostels')
        .set('Cookie', superintendentCookie)
        .send({
          name: 'Forbidden Hostel',
          code: 'FH',
          type: 'GIRLS',
          capacity: 20
        });

      expect(res.status).toBe(403);
    });

    it('GET /api/master/data-integrity — denies access to non-SuperAdmin user', async () => {
      const res = await request(app)
        .get('/api/master/data-integrity')
        .set('Cookie', superintendentCookie);

      expect(res.status).toBe(403);
    });
  });

});
