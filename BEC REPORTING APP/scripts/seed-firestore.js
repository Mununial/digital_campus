const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'reporting-management-sys-8ce96';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/students`;

const sampleStudents = [
    {
        id: 'BEC-STUDENT-2026-001',
        data: {
            id: 'BEC-STUDENT-2026-001',
            role: 'student',
            admin: {
                registrationNumber: '260101001',
                enrollmentNumber: 'EN2026001',
                rollNumber: '26CSE01',
                studentId: 'BEC-2026-CSE-001',
                section: 'A',
                remarks: 'All documents verified successfully by Admin.',
                status: 'COMPLETED',
                verified: true,
                idCardGenerated: true,
                lastUpdated: new Date().toISOString()
            },
            reporting: {
                reportingDate: '2026-07-28',
                reportingTime: '10:30',
                academicSession: '2026-2030',
                academicYear: '1st Year',
                program: 'B.Tech',
                branch: 'Computer Science & Engineering',
                admissionType: 'Regular'
            },
            facilities: {
                hostelRequired: 'Yes',
                transportRequired: 'No'
            },
            fees: {
                tuitionFeeAmount: '85000',
                tuitionReceiptNumber: 'REC-TUITION-9901',
                tuitionReceiptDate: '2026-07-28',
                hostelFeeAmount: '25000',
                hostelReceiptNumber: 'REC-HOSTEL-9901',
                hostelReceiptDate: '2026-07-28',
                transportFeeAmount: '',
                transportReceiptNumber: '',
                transportReceiptDate: '',
                oneTimeFeeAmount: '5000',
                oneTimeFeeReceiptNumber: 'REC-ONETIME-9901',
                oneTimeFeeReceiptDate: '2026-07-28',
                counsellingFeeAmount: '10000',
                counsellingFeeReceiptNumber: 'REC-COUNS-9901',
                counsellingFeeReceiptDate: '2026-07-28'
            },
            personal: {
                studentFullName: 'Rahul Sharma',
                fatherName: 'Rajesh Sharma',
                motherName: 'Sunita Sharma',
                category: 'General',
                aadhaarNumber: '1234-5678-9012',
                abcId: 'ABC-1234567',
                panNumber: 'ABCDE1234F',
                studentMobile: '9876543210',
                whatsappNumber: '9876543210',
                fatherMobile: '9876500001',
                motherMobile: '9876500002',
                studentEmail: 'rahul.sharma@gmail.com',
                permanentAddress: 'Plot No. 123, Saheed Nagar',
                district: 'Khurda',
                state: 'Odisha',
                pinCode: '751007',
                dob: '2005-05-15',
                gender: 'Male',
                bloodGroup: 'O+'
            },
            documents: {
                certificate10th: true,
                certificate12th: true,
                tcMigration: true,
                aadhaar: true,
                pan: true,
                passportPhotos: true,
                admissionLetter: true,
                residenceCertificate: true,
                casteCertificate: false,
                incomeCertificate: true,
                bankDetails: true,
                studentPhoto: true,
                studentSignature: true,
                parentSignature: true
            },
            hostel: {
                medicalCondition: 'None',
                emergencyContactPerson: 'Rajesh Sharma',
                emergencyContactNumber: '9876500001',
                parentConsent: true,
                studentDeclaration: true
            },
            transport: {
                stoppageName: '',
                pickupLocation: '',
                dropLocation: '',
                nearestBusStop: '',
                emergencyContact: '',
                studentDeclaration: false
            },
            antiragging: {
                agreeRules: true,
                agreeDiscipline: true,
                agreeTrueInfo: true,
                agreeFollow: true,
                bloodGroup: 'O+',
                emergencyContactName: 'Rajesh Sharma',
                emergencyContactNumber: '9876500001',
                parentGuardianName: 'Rajesh Sharma',
                relationship: 'Father'
            },
            idCard: {
                generated: true,
                generatedAt: new Date().toISOString()
            }
        }
    },
    {
        id: 'BEC-STUDENT-2026-002',
        data: {
            id: 'BEC-STUDENT-2026-002',
            role: 'student',
            admin: {
                registrationNumber: '260101002',
                enrollmentNumber: 'EN2026002',
                rollNumber: '26ECE05',
                studentId: 'BEC-2026-ECE-002',
                section: 'A',
                remarks: 'Pending document verification for 12th Certificate.',
                status: 'IN_PROGRESS',
                verified: false,
                idCardGenerated: false,
                lastUpdated: new Date().toISOString()
            },
            reporting: {
                reportingDate: '2026-07-29',
                reportingTime: '11:00',
                academicSession: '2026-2030',
                academicYear: '1st Year',
                program: 'B.Tech',
                branch: 'Electronics & Communication Engineering',
                admissionType: 'Regular'
            },
            facilities: {
                hostelRequired: 'No',
                transportRequired: 'Yes'
            },
            fees: {
                tuitionFeeAmount: '75000',
                tuitionReceiptNumber: 'REC-TUITION-9902',
                tuitionReceiptDate: '2026-07-29',
                hostelFeeAmount: '',
                hostelReceiptNumber: '',
                hostelReceiptDate: '',
                transportFeeAmount: '18000',
                transportReceiptNumber: 'REC-TRANS-9902',
                transportReceiptDate: '2026-07-29',
                oneTimeFeeAmount: '5000',
                oneTimeFeeReceiptNumber: 'REC-ONETIME-9902',
                oneTimeFeeReceiptDate: '2026-07-29',
                counsellingFeeAmount: '10000',
                counsellingFeeReceiptNumber: 'REC-COUNS-9902',
                counsellingFeeReceiptDate: '2026-07-29'
            },
            personal: {
                studentFullName: 'Priya Dash',
                fatherName: 'Subhash Dash',
                motherName: 'Anita Dash',
                category: 'OBC',
                aadhaarNumber: '9876-5432-1098',
                abcId: 'ABC-9876543',
                panNumber: 'XYZPD9876K',
                studentMobile: '9776123456',
                whatsappNumber: '9776123456',
                fatherMobile: '9776000001',
                motherMobile: '9776000002',
                studentEmail: 'priya.dash@gmail.com',
                permanentAddress: 'House No 45, Jayadev Vihar',
                district: 'Khurda',
                state: 'Odisha',
                pinCode: '751013',
                dob: '2006-01-20',
                gender: 'Female',
                bloodGroup: 'B+'
            },
            documents: {
                certificate10th: true,
                certificate12th: false,
                tcMigration: true,
                aadhaar: true,
                pan: true,
                passportPhotos: true,
                admissionLetter: true,
                residenceCertificate: true,
                casteCertificate: true,
                incomeCertificate: true,
                bankDetails: true,
                studentPhoto: true,
                studentSignature: true,
                parentSignature: true
            },
            hostel: {
                medicalCondition: '',
                emergencyContactPerson: '',
                emergencyContactNumber: '',
                parentConsent: false,
                studentDeclaration: false
            },
            transport: {
                stoppageName: 'Jayadev Vihar Overbridge',
                pickupLocation: 'Saheed Nagar Stop',
                dropLocation: 'BEC Campus Gate 1',
                nearestBusStop: 'Jayadev Vihar',
                emergencyContact: '9776000001',
                studentDeclaration: true
            },
            antiragging: {
                agreeRules: true,
                agreeDiscipline: true,
                agreeTrueInfo: true,
                agreeFollow: true,
                bloodGroup: 'B+',
                emergencyContactName: 'Subhash Dash',
                emergencyContactNumber: '9776000001',
                parentGuardianName: 'Subhash Dash',
                relationship: 'Father'
            },
            idCard: {
                generated: false,
                generatedAt: null
            }
        }
    },
    {
        id: 'BEC-STUDENT-2026-003',
        data: {
            id: 'BEC-STUDENT-2026-003',
            role: 'student',
            admin: {
                registrationNumber: '',
                enrollmentNumber: '',
                rollNumber: '',
                studentId: 'BEC-2026-ME-003',
                section: '',
                remarks: 'Registration number awaiting BPUT portal allocation.',
                status: 'PENDING_REGD',
                verified: false,
                idCardGenerated: false,
                lastUpdated: new Date().toISOString()
            },
            reporting: {
                reportingDate: '2026-07-29',
                reportingTime: '14:15',
                academicSession: '2026-2030',
                academicYear: '1st Year',
                program: 'B.Tech',
                branch: 'Mechanical Engineering',
                admissionType: 'Regular'
            },
            facilities: {
                hostelRequired: 'Yes',
                transportRequired: 'Yes'
            },
            fees: {
                tuitionFeeAmount: '70000',
                tuitionReceiptNumber: 'REC-TUITION-9903',
                tuitionReceiptDate: '2026-07-29',
                hostelFeeAmount: '25000',
                hostelReceiptNumber: 'REC-HOSTEL-9903',
                hostelReceiptDate: '2026-07-29',
                transportFeeAmount: '18000',
                transportReceiptNumber: 'REC-TRANS-9903',
                transportReceiptDate: '2026-07-29',
                oneTimeFeeAmount: '5000',
                oneTimeFeeReceiptNumber: 'REC-ONETIME-9903',
                oneTimeFeeReceiptDate: '2026-07-29',
                counsellingFeeAmount: '10000',
                counsellingFeeReceiptNumber: 'REC-COUNS-9903',
                counsellingFeeReceiptDate: '2026-07-29'
            },
            personal: {
                studentFullName: 'Ankit Mohanty',
                fatherName: 'Bhabani Mohanty',
                motherName: 'Sasmita Mohanty',
                category: 'General',
                aadhaarNumber: '4567-8901-2345',
                abcId: 'ABC-4567890',
                panNumber: 'AMKPM4567L',
                studentMobile: '9938887766',
                whatsappNumber: '9938887766',
                fatherMobile: '9938000001',
                motherMobile: '9938000002',
                studentEmail: 'ankit.mohanty@gmail.com',
                permanentAddress: 'Cuttack Road, Rasulgarh',
                district: 'Khurda',
                state: 'Odisha',
                pinCode: '751010',
                dob: '2005-09-10',
                gender: 'Male',
                bloodGroup: 'A+'
            },
            documents: {
                certificate10th: true,
                certificate12th: true,
                tcMigration: true,
                aadhaar: true,
                pan: true,
                passportPhotos: true,
                admissionLetter: true,
                residenceCertificate: true,
                casteCertificate: false,
                incomeCertificate: false,
                bankDetails: true,
                studentPhoto: true,
                studentSignature: true,
                parentSignature: true
            },
            hostel: {
                medicalCondition: 'Asthma (Mild)',
                emergencyContactPerson: 'Bhabani Mohanty',
                emergencyContactNumber: '9938000001',
                parentConsent: true,
                studentDeclaration: true
            },
            transport: {
                stoppageName: 'Rasulgarh Square',
                pickupLocation: 'Rasulgarh Bus Stop',
                dropLocation: 'BEC Main Entrance',
                nearestBusStop: 'Rasulgarh',
                emergencyContact: '9938000001',
                studentDeclaration: true
            },
            antiragging: {
                agreeRules: true,
                agreeDiscipline: true,
                agreeTrueInfo: true,
                agreeFollow: true,
                bloodGroup: 'A+',
                emergencyContactName: 'Bhabani Mohanty',
                emergencyContactNumber: '9938000001',
                parentGuardianName: 'Bhabani Mohanty',
                relationship: 'Father'
            },
            idCard: {
                generated: false,
                generatedAt: null
            }
        }
    },
    {
        id: 'BEC-STUDENT-2026-004',
        data: {
            id: 'BEC-STUDENT-2026-004',
            role: 'student',
            admin: {
                registrationNumber: '260101004',
                enrollmentNumber: 'EN2026004',
                rollNumber: '26EEE12',
                studentId: 'BEC-2026-EEE-004',
                section: 'B',
                remarks: 'ID Card creation requested by HOD.',
                status: 'COMPLETED',
                verified: true,
                idCardGenerated: false,
                lastUpdated: new Date().toISOString()
            },
            reporting: {
                reportingDate: '2026-07-29',
                reportingTime: '15:30',
                academicSession: '2026-2030',
                academicYear: '1st Year',
                program: 'B.Tech',
                branch: 'Electrical & Electronics Engineering',
                admissionType: 'Regular'
            },
            facilities: {
                hostelRequired: 'No',
                transportRequired: 'No'
            },
            fees: {
                tuitionFeeAmount: '65000',
                tuitionReceiptNumber: 'REC-TUITION-9904',
                tuitionReceiptDate: '2026-07-29',
                hostelFeeAmount: '',
                hostelReceiptNumber: '',
                hostelReceiptDate: '',
                transportFeeAmount: '',
                transportReceiptNumber: '',
                transportReceiptDate: '',
                oneTimeFeeAmount: '5000',
                oneTimeFeeReceiptNumber: 'REC-ONETIME-9904',
                oneTimeFeeReceiptDate: '2026-07-29',
                counsellingFeeAmount: '10000',
                counsellingFeeReceiptNumber: 'REC-COUNS-9904',
                counsellingFeeReceiptDate: '2026-07-29'
            },
            personal: {
                studentFullName: 'Swati Behera',
                fatherName: 'Gopinath Behera',
                motherName: 'Kalyani Behera',
                category: 'SC',
                aadhaarNumber: '3456-7890-1234',
                abcId: 'ABC-3456789',
                panNumber: 'SWBPB3456M',
                studentMobile: '9437112233',
                whatsappNumber: '9437112233',
                fatherMobile: '9437000001',
                motherMobile: '9437000002',
                studentEmail: 'swati.behera@gmail.com',
                permanentAddress: 'Khandagiri Square',
                district: 'Khurda',
                state: 'Odisha',
                pinCode: '751030',
                dob: '2006-03-12',
                gender: 'Female',
                bloodGroup: 'AB+'
            },
            documents: {
                certificate10th: true,
                certificate12th: true,
                tcMigration: true,
                aadhaar: true,
                pan: true,
                passportPhotos: true,
                admissionLetter: true,
                residenceCertificate: true,
                casteCertificate: true,
                incomeCertificate: true,
                bankDetails: true,
                studentPhoto: true,
                studentSignature: true,
                parentSignature: true
            },
            hostel: {
                medicalCondition: '',
                emergencyContactPerson: '',
                emergencyContactNumber: '',
                parentConsent: false,
                studentDeclaration: false
            },
            transport: {
                stoppageName: '',
                pickupLocation: '',
                dropLocation: '',
                nearestBusStop: '',
                emergencyContact: '',
                studentDeclaration: false
            },
            antiragging: {
                agreeRules: true,
                agreeDiscipline: true,
                agreeTrueInfo: true,
                agreeFollow: true,
                bloodGroup: 'AB+',
                emergencyContactName: 'Gopinath Behera',
                emergencyContactNumber: '9437000001',
                parentGuardianName: 'Gopinath Behera',
                relationship: 'Father'
            },
            idCard: {
                generated: false,
                generatedAt: null
            }
        }
    },
    {
        id: 'BEC-STUDENT-2026-005',
        data: {
            id: 'BEC-STUDENT-2026-005',
            role: 'student',
            admin: {
                registrationNumber: '260101005',
                enrollmentNumber: 'EN2026005',
                rollNumber: '26CE08',
                studentId: 'BEC-2026-CE-005',
                section: 'A',
                remarks: 'Reporting data completed. Hostel room allocated (Block B, Room 102).',
                status: 'COMPLETED',
                verified: true,
                idCardGenerated: true,
                lastUpdated: new Date().toISOString()
            },
            reporting: {
                reportingDate: '2026-07-29',
                reportingTime: '16:00',
                academicSession: '2026-2030',
                academicYear: '1st Year',
                program: 'B.Tech',
                branch: 'Civil Engineering',
                admissionType: 'Regular'
            },
            facilities: {
                hostelRequired: 'Yes',
                transportRequired: 'No'
            },
            fees: {
                tuitionFeeAmount: '80000',
                tuitionReceiptNumber: 'REC-TUITION-9905',
                tuitionReceiptDate: '2026-07-29',
                hostelFeeAmount: '25000',
                hostelReceiptNumber: 'REC-HOSTEL-9905',
                hostelReceiptDate: '2026-07-29',
                transportFeeAmount: '',
                transportReceiptNumber: '',
                transportReceiptDate: '',
                oneTimeFeeAmount: '5000',
                oneTimeFeeReceiptNumber: 'REC-ONETIME-9905',
                oneTimeFeeReceiptDate: '2026-07-29',
                counsellingFeeAmount: '10000',
                counsellingFeeReceiptNumber: 'REC-COUNS-9905',
                counsellingFeeReceiptDate: '2026-07-29'
            },
            personal: {
                studentFullName: 'Rohan Kumar Nayak',
                fatherName: 'Dhirendra Nayak',
                motherName: 'Minati Nayak',
                category: 'ST',
                aadhaarNumber: '5678-9012-3456',
                abcId: 'ABC-5678901',
                panNumber: 'RKNPK5678N',
                studentMobile: '9124001122',
                whatsappNumber: '9124001122',
                fatherMobile: '9124000001',
                motherMobile: '9124000002',
                studentEmail: 'rohan.nayak@gmail.com',
                permanentAddress: 'At/PO: Chandaka',
                district: 'Khurda',
                state: 'Odisha',
                pinCode: '751024',
                dob: '2005-11-25',
                gender: 'Male',
                bloodGroup: 'O-'
            },
            documents: {
                certificate10th: true,
                certificate12th: true,
                tcMigration: true,
                aadhaar: true,
                pan: true,
                passportPhotos: true,
                admissionLetter: true,
                residenceCertificate: true,
                casteCertificate: true,
                incomeCertificate: true,
                bankDetails: true,
                studentPhoto: true,
                studentSignature: true,
                parentSignature: true
            },
            hostel: {
                medicalCondition: 'None',
                emergencyContactPerson: 'Dhirendra Nayak',
                emergencyContactNumber: '9124000001',
                parentConsent: true,
                studentDeclaration: true
            },
            transport: {
                stoppageName: '',
                pickupLocation: '',
                dropLocation: '',
                nearestBusStop: '',
                emergencyContact: '',
                studentDeclaration: false
            },
            antiragging: {
                agreeRules: true,
                agreeDiscipline: true,
                agreeTrueInfo: true,
                agreeFollow: true,
                bloodGroup: 'O-',
                emergencyContactName: 'Dhirendra Nayak',
                emergencyContactNumber: '9124000001',
                parentGuardianName: 'Dhirendra Nayak',
                relationship: 'Father'
            },
            idCard: {
                generated: true,
                generatedAt: new Date().toISOString()
            }
        }
    }
];

function toFirestoreFields(obj) {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            fields[key] = { nullValue: null };
        } else if (typeof value === 'boolean') {
            fields[key] = { booleanValue: value };
        } else if (typeof value === 'number') {
            fields[key] = { integerValue: value };
        } else if (typeof value === 'string') {
            fields[key] = { stringValue: value };
        } else if (typeof value === 'object') {
            fields[key] = { mapValue: { fields: toFirestoreFields(value) } };
        }
    }
    return fields;
}

async function seed() {
    console.log('Seeding 5 structured student records into Firestore...');
    for (const item of sampleStudents) {
        const url = `${BASE_URL}/${item.id}`;
        const body = {
            name: `projects/${PROJECT_ID}/databases/(default)/documents/students/${item.id}`,
            fields: toFirestoreFields(item.data)
        };

        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            console.log(`Successfully seeded student: ${item.id} (${item.data.personal.studentFullName})`);
        } else {
            const errText = await res.text();
            console.error(`Failed to seed ${item.id}:`, res.status, errText);
        }
    }
    console.log('Seeding complete!');
}

seed();
