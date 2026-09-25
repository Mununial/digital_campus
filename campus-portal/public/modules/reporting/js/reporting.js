import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { Card } from './components/Card.js';
import { Input } from './components/Input.js';
import { Select } from './components/Select.js';
import { Store } from './store.js';

import { setupAutoAdvanceFields } from './main.js';

document.addEventListener('DOMContentLoaded', () => {
    // Inject Layout
    const headerEl = document.getElementById('header-container');
    const footerEl = document.getElementById('footer-container');
    if (headerEl) headerEl.innerHTML = Header();
    if (footerEl) footerEl.innerHTML = Footer();

    // Render Cards
    renderCards();
    
    // Bind Data and Listeners
    bindDataToForm();
    setupListeners();
    setupAutoAdvanceFields();
});

window.addEventListener('navigate-step', (e) => {
    if (e.detail && (e.detail.nextStep === 'reporting' || e.detail.step === 'reporting')) {
        bindDataToForm();
    }
});

window.addEventListener('step-active', (e) => {
    if (e.detail && (e.detail.nextStep === 'reporting' || e.detail.step === 'reporting')) {
        bindDataToForm();
    }
});

function renderCards() {
    // Card 1: Reporting & Academic Details
    const reportingContent = `
        <div class="grid-2">
            ${Input({ id: 'reportingDate', name: 'reportingDate', label: 'Reporting Date', type: 'date', required: true })}
            ${Input({ id: 'reportingTime', name: 'reportingTime', label: 'Reporting Time', type: 'time', required: true })}
            ${Select({ 
                id: 'program', name: 'program', label: 'Program', required: true,
                options: [
                    {value: 'B.Tech', label: 'B.TECH PROGRAMS'},
                    {value: 'Diploma', label: 'DIPLOMA COURSES'},
                    {value: 'MBA', label: 'MBA PROGRAM'}
                ]
            })}
            ${Select({ 
                id: 'admissionType', name: 'admissionType', label: 'Admission Type', required: true,
                options: [
                    {value: 'Regular', label: 'Regular'},
                    {value: 'Lateral Entry', label: 'Lateral Entry (LE)'}
                ]
            })}
            ${Select({ 
                id: 'admissionReference', name: 'admissionReference', label: 'Admission Reference', required: true,
                options: [
                    {value: 'Direct', label: 'Direct Admission'},
                    {value: 'Referred by Person', label: 'Referred by a Person'}
                ]
            })}
            <div id="referrer-name-container" style="display: none;">
                ${Input({ id: 'referrerName', name: 'referrerName', label: 'Referrer Name (Person / Staff / Agency)', placeholder: "Enter referrer's full name" })}
            </div>
            ${Select({ 
                id: 'academicSession', name: 'academicSession', label: 'Academic Session', required: true,
                options: []
            })}
            ${Select({ 
                id: 'academicYear', name: 'academicYear', label: 'Academic Year', required: true,
                options: []
            })}
            ${Select({ 
                id: 'branch', name: 'branch', label: 'Branch / Department', required: true,
                options: []
            })}
        </div>
    `;
    const cardReporting = document.getElementById('card-reporting-info');
    if (cardReporting) cardReporting.innerHTML = Card({ title: '1. Reporting & Academic Information (Master Info)', content: reportingContent });

    // Card 2: Student Master Profile
    const studentContent = `
        <div class="grid-2">
            ${Input({ id: 'studentFullName', name: 'studentFullName', label: 'Student Full Name', required: true })}
            ${Input({ id: 'fatherName', name: 'fatherName', label: 'Father Name', required: true })}
            ${Input({ id: 'motherName', name: 'motherName', label: 'Mother Name', required: true })}
            ${Input({ id: 'dob', name: 'dob', label: 'Date of Birth', type: 'date', required: true })}
            ${Select({ 
                id: 'gender', name: 'gender', label: 'Gender', required: true,
                options: [{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}, {value: 'Other', label: 'Other'}]
            })}
            ${Select({ 
                id: 'bloodGroup', name: 'bloodGroup', label: 'Blood Group', required: true,
                options: [
                    {value: 'A+', label: 'A+'}, {value: 'A-', label: 'A-'},
                    {value: 'B+', label: 'B+'}, {value: 'B-', label: 'B-'},
                    {value: 'O+', label: 'O+'}, {value: 'O-', label: 'O-'},
                    {value: 'AB+', label: 'AB+'}, {value: 'AB-', label: 'AB-'}
                ]
            })}
            ${Select({ 
                id: 'category', name: 'category', label: 'Caste / Category', required: true,
                options: [
                    {value: 'General', label: 'General'},
                    {value: 'OBC', label: 'OBC (Other Backward Classes)'},
                    {value: 'SC', label: 'SC (Scheduled Caste)'},
                    {value: 'ST', label: 'ST (Scheduled Tribe)'},
                    {value: 'SEBC', label: 'SEBC'},
                    {value: 'EWS', label: 'EWS (Economically Weaker Section)'},
                    {value: 'TFW', label: 'TFW (Tuition Fee Waiver)'}
                ]
            })}
            ${Input({ id: 'aadhaarNumber', name: 'aadhaarNumber', label: 'Aadhaar Number (12 Digits)', required: true })}
            ${Input({ id: 'abcId', name: 'abcId', label: 'ABC ID Number (Optional)' })}
            ${Input({ id: 'panNumber', name: 'panNumber', label: 'PAN Card Number (Optional)' })}
        </div>

        <!-- SC / ST OTR Number & Note Container -->
        <div id="sc-st-otr-container" style="display: none; margin-top: 16px;">
            <div style="background: #fffbeb; border: 1.5px solid #fef08a; border-left: 5px solid #eab308; border-radius: 8px; padding: 14px 18px; margin-bottom: 14px; font-size: 0.93rem; color: #1e293b; line-height: 1.55; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <strong style="color: #0f172a;">Note:</strong> Please provide your One Time Registration (OTR) number generated from the National Scholarship Portal (NSP). If you haven't generated one, visit <a href="https://scholarships.gov.in" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: underline; font-weight: 600;">scholarships.gov.in</a> to generate your OTR number before applying on OSSP.
            </div>
            <div class="grid-2">
                ${Input({ id: 'otrNumber', name: 'otrNumber', label: 'One Time Registration (OTR) Number', placeholder: 'Enter OTR Number from NSP' })}
            </div>
        </div>

        <!-- Non-SC/ST Container: Ration Card & CM Kisan -->
        <div id="non-scst-details-container" style="margin-top: 16px;">
            <div class="grid-2">
                ${Input({ id: 'rationCardNo', name: 'rationCardNo', label: 'Ration Card Number (Optional)', placeholder: 'Enter Ration Card No.' })}
                ${Select({ 
                    id: 'hasCmKisan', name: 'hasCmKisan', label: 'Do you have CM Kisan?', required: false,
                    options: [
                        {value: 'No', label: 'No'},
                        {value: 'Yes', label: 'Yes'}
                    ]
                })}
            </div>
            <div id="cm-kisan-details-container" style="display: none; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 16px; margin-top: 16px;">
                <h5 style="margin-top: 0; margin-bottom: 12px; color: #166534; font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                    🌾 CM Kisan Beneficiary Details
                </h5>
                <div class="grid-2">
                    ${Input({ id: 'cmKisanBeneficiaryId', name: 'cmKisanBeneficiaryId', label: 'CM Kisan Beneficiary ID', placeholder: 'Enter Beneficiary ID' })}
                    ${Input({ id: 'cmKisanBeneficiaryName', name: 'cmKisanBeneficiaryName', label: 'Beneficiary Name', placeholder: 'Enter Beneficiary Full Name' })}
                    <div style="grid-column: 1 / -1;">
                        ${Input({ id: 'cmKisanBeneficiaryAadhaar', name: 'cmKisanBeneficiaryAadhaar', label: 'Beneficiary Aadhaar Number (12 Digits)', placeholder: 'Enter 12-digit Beneficiary Aadhaar No.' })}
                    </div>
                </div>
            </div>
        </div>
        <div class="grid-2" style="margin-top: 16px;">
            ${Input({ id: 'studentMobile', name: 'studentMobile', label: 'Student Mobile Number', type: 'tel', required: true })}
            ${Input({ id: 'whatsappNumber', name: 'whatsappNumber', label: 'WhatsApp Number', type: 'tel', required: true })}
            ${Input({ id: 'fatherMobile', name: 'fatherMobile', label: 'Father Mobile Number', type: 'tel', required: true })}
            ${Input({ id: 'motherMobile', name: 'motherMobile', label: 'Mother Mobile Number', type: 'tel', required: true })}
            ${Input({ id: 'studentEmail', name: 'studentEmail', label: 'Student Email ID', type: 'email', required: true })}
        </div>
        <h4 style="margin-top:var(--space-4); font-size: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Permanent Address</h4>
        <div class="grid-2">
            <div style="grid-column: 1 / -1;">
                ${Input({ id: 'permanentAddress', name: 'permanentAddress', label: 'Full Address', required: true })}
            </div>
            ${Select({ 
                id: 'state', name: 'state', label: 'State', required: true,
                options: [
                    {value: 'Odisha', label: 'Odisha'},
                    {value: 'Bihar', label: 'Bihar'},
                    {value: 'Jharkhand', label: 'Jharkhand'},
                    {value: 'West Bengal', label: 'West Bengal'},
                    {value: 'Andhra Pradesh', label: 'Andhra Pradesh'},
                    {value: 'Telangana', label: 'Telangana'},
                    {value: 'Chhattisgarh', label: 'Chhattisgarh'},
                    {value: 'Assam', label: 'Assam'},
                    {value: 'Uttar Pradesh', label: 'Uttar Pradesh'},
                    {value: 'Delhi', label: 'Delhi'},
                    {value: 'Maharashtra', label: 'Maharashtra'},
                    {value: 'Karnataka', label: 'Karnataka'},
                    {value: 'Other State', label: 'Other State'}
                ]
            })}
            ${Select({ 
                id: 'district', name: 'district', label: 'District', required: true,
                options: []
            })}
            ${Input({ id: 'pinCode', name: 'pinCode', label: 'PIN Code', required: true })}
        </div>
    `;
    const cardStudent = document.getElementById('card-student-info');
    if (cardStudent) cardStudent.innerHTML = Card({ title: '2. Personal & Contact Details', content: studentContent });

    // Card 3: Fee Receipt Details
    const feeContent = `
        <!-- Dynamic Fee Receipts Container -->
        <div id="additional-fees-container"></div>

        <div style="margin-top: var(--space-3); text-align: left;">
            <button type="button" id="add-fee-btn" class="btn" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; font-weight: 600; background: #eff6ff; color: #1d4ed8; border: 1.5px dashed #3b82f6; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">
                <span style="font-size: 1.25rem; font-weight: bold; line-height: 1;">+</span> Add Fee Receipt
            </button>
            <p style="margin: 6px 0 0 0; font-size: 0.8rem; color: #64748b;">If you paid multiple receipts (e.g. Tuition, Hostel, Transport), click + Add Fee Receipt to add another.</p>
        </div>
    `;
    const cardFee = document.getElementById('card-fee-details');
    if (cardFee) cardFee.innerHTML = Card({ title: '3. Fee Payment & Receipt Details', content: feeContent });
}

const BRANCHES_BY_PROGRAM = {
    'B.Tech': [
        { value: 'Aeronautical Engineering', label: 'Aeronautical Engineering' },
        { value: 'Aircraft Maintenance Engineering', label: 'Aircraft Maintenance Engineering' },
        { value: 'Agriculture Engineering', label: 'Agriculture Engineering' },
        { value: 'Food Engineering', label: 'Food Engineering' },
        { value: 'Civil Engineering', label: 'Civil Engineering' },
        { value: 'Civil and Environmental Engineering', label: 'Civil and Environmental Engineering' },
        { value: 'Computer Science Engineering', label: 'Computer Science Engineering' },
        { value: 'CSE (Data Science)', label: 'CSE (Data Science)' },
        { value: 'Electrical Engineering', label: 'Electrical Engineering' },
        { value: 'Electrical and Computer Engineering', label: 'Electrical and Computer Engineering' },
        { value: 'Mechanical Engineering', label: 'Mechanical Engineering' },
        { value: 'Mechanical Mechatronics Engineering', label: 'Mechanical Mechatronics Engineering' }
    ],
    'Diploma': [
        { value: 'Aeronautical Engineering', label: 'Aeronautical Engineering' },
        { value: 'Aircraft Maintenance Engineering (AME)', label: 'Aircraft Maintenance Engineering (AME)' },
        { value: 'Civil Engineering', label: 'Civil Engineering' },
        { value: 'Electrical Engineering', label: 'Electrical Engineering' },
        { value: 'Mechanical Engineering', label: 'Mechanical Engineering' }
    ],
    'MBA': [
        { value: 'Marketing', label: 'Marketing' },
        { value: 'Finance', label: 'Finance' },
        { value: 'Human Resource', label: 'Human Resource' },
        { value: 'Agri-Business', label: 'Agri-Business' }
    ]
};

const DISTRICTS_BY_STATE = {
    'Odisha': [
        'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh', 
        'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 
        'Kandhamal', 'Kendrapara', 'Keonjhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 
        'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundergarh'
    ],
    'Bihar': [
        'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 
        'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 
        'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 
        'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 
        'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'
    ],
    'Jharkhand': [
        'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 
        'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 
        'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahebganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'
    ],
    'West Bengal': [
        'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 
        'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 
        'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 
        'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'
    ],
    'Andhra Pradesh': [
        'Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya', 'Bapatla', 'Chittoor', 
        'East Godavari', 'Eluru', 'Guntur', 'Kakinada', 'NTR', 'Nandyal', 'Palnadu', 
        'Parvathipuram Manyam', 'Prakasam', 'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai', 
        'Srikakulam', 'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'
    ],
    'Telangana': [
        'Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 
        'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem', 'Mahabubabad', 
        'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 
        'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 
        'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 
        'Hanamkonda', 'Yadadri Bhuvanagiri'
    ],
    'Chhattisgarh': [
        'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 
        'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Gaurela-Pendra-Marwahi', 'Janjgir-Champa', 
        'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Koriya', 'Mahasamund', 
        'Manendragarh-Chirmiri-Bharatpur', 'Mohla-Manpur-Ambagarh Chowki', 'Mungeli', 'Narayanpur', 
        'Raigarh', 'Raipur', 'Rajnandgaon', 'Sarangarh-Bilaigarh', 'Sukma', 'Surajpur', 'Surguja', 
        'Khairagarh-Chhuikhadan-Gandai'
    ],
    'Assam': [
        'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang', 
        'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 
        'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 
        'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 
        'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'
    ],
    'Uttar Pradesh': [
        'Agra', 'Aligarh', 'Prayagraj', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 
        'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 
        'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 
        'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Ayodhya', 'Farrukhabad', 'Fatehpur', 
        'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 
        'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 
        'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar', 
        'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 
        'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 
        'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 
        'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 
        'Unnao', 'Varanasi'
    ],
    'Delhi': [
        'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 
        'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'
    ],
    'Maharashtra': [
        'Ahmednagar', 'Akola', 'Amravati', 'Chhatrapati Sambhaji Nagar', 'Beed', 'Bhandara', 'Buldhana', 
        'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 
        'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 
        'Dharashiv', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 
        'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'
    ],
    'Karnataka': [
        'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 
        'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 
        'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 
        'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayanagara', 
        'Vijayapura', 'Yadgir'
    ]
};

function updateAdmissionTypeOptions(selectedProgram, currentAdmissionTypeValue = '') {
    const admissionTypeEl = document.getElementById('admissionType');
    if (!admissionTypeEl) return;

    let options = [
        { value: 'Regular', label: 'Regular' },
        { value: 'Lateral Entry', label: 'Lateral Entry (LE)' }
    ];

    if (selectedProgram === 'MBA') {
        options = [
            { value: 'Regular', label: 'Regular' }
        ];
    }

    let html = '<option value="" disabled>Select Admission Type</option>';
    options.forEach(opt => {
        const isSelected = (opt.value === currentAdmissionTypeValue || (selectedProgram === 'MBA' && opt.value === 'Regular'));
        html += `<option value="${opt.value}" ${isSelected ? 'selected' : ''}>${opt.label}</option>`;
    });

    admissionTypeEl.innerHTML = html;

    if (options.some(opt => opt.value === currentAdmissionTypeValue)) {
        admissionTypeEl.value = currentAdmissionTypeValue;
    } else {
        admissionTypeEl.value = 'Regular';
        if (Store.data.reporting) {
            Store.data.reporting.admissionType = 'Regular';
        }
    }
}

function updateBranchOptions(selectedProgram, currentBranchValue = '') {
    const branchEl = document.getElementById('branch');
    if (!branchEl) return;

    let options = BRANCHES_BY_PROGRAM[selectedProgram];
    if (!options) {
        options = [
            ...BRANCHES_BY_PROGRAM['B.Tech'],
            ...BRANCHES_BY_PROGRAM['Diploma'],
            ...BRANCHES_BY_PROGRAM['MBA']
        ];
    }

    let html = '<option value="" disabled selected>Select Branch / Department</option>';
    options.forEach(opt => {
        const selected = (opt.value === currentBranchValue || opt.label === currentBranchValue) ? 'selected' : '';
        html += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
    });

    branchEl.innerHTML = html;

    const matchingOpt = options.find(o => o.value === currentBranchValue || o.label === currentBranchValue);
    if (matchingOpt) {
        branchEl.value = matchingOpt.value;
    } else {
        branchEl.value = '';
    }
}

function updateAcademicOptions(program, admissionType, currentSession = '', currentYear = '') {
    const sessionEl = document.getElementById('academicSession');
    const yearEl = document.getElementById('academicYear');

    let duration = 4;
    if (program === 'B.Tech') {
        duration = (admissionType === 'Lateral Entry') ? 3 : 4;
    } else if (program === 'Diploma') {
        duration = (admissionType === 'Lateral Entry') ? 2 : 3;
    } else if (program === 'MBA') {
        duration = 2;
    }

    // Sessions up to 2030 start year
    const sessions = [];
    for (let startYear = 2024; startYear <= 2030; startYear++) {
        const endYear = startYear + duration;
        const sessionStr = `${startYear}-${endYear}`;
        sessions.push({ value: sessionStr, label: sessionStr });
    }

    if (sessionEl) {
        let html = '<option value="" disabled selected>Select Academic Session</option>';
        sessions.forEach(s => {
            const sel = (s.value === currentSession) ? 'selected' : '';
            html += `<option value="${s.value}" ${sel}>${s.label}</option>`;
        });
        sessionEl.innerHTML = html;
        if (sessions.some(s => s.value === currentSession)) {
            sessionEl.value = currentSession;
        } else {
            sessionEl.value = '';
        }
    }

    // Academic Years
    let years = [];
    if (program === 'B.Tech') {
        if (admissionType === 'Lateral Entry') {
            years = [
                { value: '2nd Year', label: '2nd Year (Semester 3 & 4)' },
                { value: '3rd Year', label: '3rd Year (Semester 5 & 6)' },
                { value: '4th Year', label: '4th Year (Semester 7 & 8)' }
            ];
        } else {
            years = [
                { value: '1st Year', label: '1st Year (Semester 1 & 2)' },
                { value: '2nd Year', label: '2nd Year (Semester 3 & 4)' },
                { value: '3rd Year', label: '3rd Year (Semester 5 & 6)' },
                { value: '4th Year', label: '4th Year (Semester 7 & 8)' }
            ];
        }
    } else if (program === 'Diploma') {
        if (admissionType === 'Lateral Entry') {
            years = [
                { value: '2nd Year', label: '2nd Year (Semester 3 & 4)' },
                { value: '3rd Year', label: '3rd Year (Semester 5 & 6)' }
            ];
        } else {
            years = [
                { value: '1st Year', label: '1st Year (Semester 1 & 2)' },
                { value: '2nd Year', label: '2nd Year (Semester 3 & 4)' },
                { value: '3rd Year', label: '3rd Year (Semester 5 & 6)' }
            ];
        }
    } else if (program === 'MBA') {
        years = [
            { value: '1st Year', label: '1st Year (Semester 1 & 2)' },
            { value: '2nd Year', label: '2nd Year (Semester 3 & 4)' }
        ];
    } else {
        years = [
            { value: '1st Year', label: '1st Year (Semester 1 & 2)' },
            { value: '2nd Year', label: '2nd Year (Semester 3 & 4)' },
            { value: '3rd Year', label: '3rd Year (Semester 5 & 6)' },
            { value: '4th Year', label: '4th Year (Semester 7 & 8)' }
        ];
    }

    if (yearEl) {
        let html = '<option value="" disabled selected>Select Academic Year</option>';
        years.forEach(y => {
            const sel = (y.value === currentYear || y.label.includes(currentYear)) ? 'selected' : '';
            html += `<option value="${y.value}" ${sel}>${y.label}</option>`;
        });
        yearEl.innerHTML = html;
        if (years.some(y => y.value === currentYear)) {
            yearEl.value = currentYear;
        } else {
            yearEl.value = '';
        }
    }
}

function updateDistrictOptions(selectedState, currentDistrictValue = '') {
    const districtEl = document.getElementById('district');
    if (!districtEl) return;

    const districts = DISTRICTS_BY_STATE[selectedState] || [];
    let html = '<option value="" disabled selected>Select District</option>';

    if (districts.length > 0) {
        districts.forEach(d => {
            const sel = (d === currentDistrictValue) ? 'selected' : '';
            html += `<option value="${d}" ${sel}>${d}</option>`;
        });
    } else {
        html += `<option value="Other District" ${currentDistrictValue === 'Other District' ? 'selected' : ''}>Other District</option>`;
    }

    districtEl.innerHTML = html;

    if (districts.includes(currentDistrictValue)) {
        districtEl.value = currentDistrictValue;
    } else if (currentDistrictValue) {
        const customOpt = document.createElement('option');
        customOpt.value = currentDistrictValue;
        customOpt.textContent = currentDistrictValue;
        customOpt.selected = true;
        districtEl.appendChild(customOpt);
    } else {
        districtEl.value = '';
    }
}

import { FIELD_SECTION_MAP } from './store.js';

function toggleReferrerField(refVal) {
    const container = document.getElementById('referrer-name-container');
    const input = document.getElementById('referrerName');
    if (!container || !input) return;

    if (refVal === 'Referred by Person') {
        container.style.display = 'block';
        input.setAttribute('required', 'required');
    } else {
        container.style.display = 'none';
        input.removeAttribute('required');
        input.value = '';
        if (Store.data.reporting) {
            Store.data.reporting.referrerName = '';
        }
    }
}

function toggleCmKisanFields(val) {
    const container = document.getElementById('cm-kisan-details-container');
    const idInput = document.getElementById('cmKisanBeneficiaryId');
    const nameInput = document.getElementById('cmKisanBeneficiaryName');
    const aadhaarInput = document.getElementById('cmKisanBeneficiaryAadhaar');
    if (!container) return;

    if (val === 'Yes') {
        container.style.display = 'block';
        if (idInput) idInput.setAttribute('required', 'required');
        if (nameInput) nameInput.setAttribute('required', 'required');
        if (aadhaarInput) aadhaarInput.setAttribute('required', 'required');
    } else {
        container.style.display = 'none';
        if (idInput) {
            idInput.removeAttribute('required');
            idInput.value = '';
        }
        if (nameInput) {
            nameInput.removeAttribute('required');
            nameInput.value = '';
        }
        if (aadhaarInput) {
            aadhaarInput.removeAttribute('required');
            aadhaarInput.value = '';
        }
        if (Store.data.personal) {
            Store.data.personal.cmKisanBeneficiaryId = '';
            Store.data.personal.cmKisanBeneficiaryName = '';
            Store.data.personal.cmKisanBeneficiaryAadhaar = '';
        }
    }
}

function toggleCasteCategoryFields(categoryVal) {
    const isScSt = (categoryVal === 'SC' || categoryVal === 'ST');
    const scStContainer = document.getElementById('sc-st-otr-container');
    const nonScStContainer = document.getElementById('non-scst-details-container');
    const otrInput = document.getElementById('otrNumber');
    const rationInput = document.getElementById('rationCardNo');
    const hasCmKisanSelect = document.getElementById('hasCmKisan');

    if (isScSt) {
        if (scStContainer) scStContainer.style.display = 'block';
        if (nonScStContainer) nonScStContainer.style.display = 'none';

        // Clear non-SC/ST inputs
        if (hasCmKisanSelect) {
            hasCmKisanSelect.value = 'No';
            toggleCmKisanFields('No');
        }
        if (rationInput) {
            rationInput.value = '';
        }
        if (Store.data.personal) {
            Store.data.personal.rationCardNo = '';
            Store.data.personal.hasCmKisan = 'No';
            Store.data.personal.cmKisanBeneficiaryId = '';
            Store.data.personal.cmKisanBeneficiaryName = '';
            Store.data.personal.cmKisanBeneficiaryAadhaar = '';
        }
    } else {
        if (scStContainer) scStContainer.style.display = 'none';
        if (otrInput) {
            otrInput.value = '';
        }
        if (Store.data.personal) {
            Store.data.personal.otrNumber = '';
        }

        if (nonScStContainer) nonScStContainer.style.display = 'block';
        const currentCmKisanVal = hasCmKisanSelect?.value || Store.data?.personal?.hasCmKisan || 'No';
        toggleCmKisanFields(currentCmKisanVal);
    }
}

function bindDataToForm() {
    const data = Store.data || {};
    const p = data.personal || {};
    const r = data.reporting || {};

    // 1. First set dynamic options based on saved or default values
    const programVal = r.program || 'B.Tech';
    const admissionTypeVal = r.admissionType || 'Regular';
    const savedBranchVal = r.branch || '';
    const savedSessionVal = r.academicSession || '';
    const savedYearVal = r.academicYear || '';

    updateAdmissionTypeOptions(programVal, admissionTypeVal);
    const effectiveAdmissionTypeVal = document.getElementById('admissionType')?.value || admissionTypeVal;
    updateBranchOptions(programVal, savedBranchVal);
    updateAcademicOptions(programVal, effectiveAdmissionTypeVal, savedSessionVal, savedYearVal);

    const stateVal = p.state || 'Odisha';
    const savedDistrictVal = p.district || '';
    updateDistrictOptions(stateVal, savedDistrictVal);

    // 2. Populate all inputs from Store.data with fallback to schema
    document.querySelectorAll('#reporting-form input:not([type="file"]):not([type="radio"]), #reporting-form select, #reporting-form textarea').forEach(el => {
        const name = el.name || el.id;
        if (!name) return;

        let val = '';
        const sec = FIELD_SECTION_MAP[name];
        if (sec && data[sec] && data[sec][name] !== undefined && data[sec][name] !== null) {
            val = data[sec][name];
        } else {
            for (const s of ['reporting', 'personal', 'fees', 'facilities']) {
                if (data[s] && data[s][name] !== undefined && data[s][name] !== null) {
                    val = data[s][name];
                    break;
                }
            }
        }

        if (val !== undefined && val !== null && val !== '') {
            el.value = val;
        }
    });

    // Handle conditional referrer name display
    const refVal = document.getElementById('admissionReference')?.value || r.admissionReference || 'Direct';
    toggleReferrerField(refVal);
    if (refVal === 'Referred by Person' && (r.referrerName || data.referrerName)) {
        const refInput = document.getElementById('referrerName');
        if (refInput) refInput.value = r.referrerName || data.referrerName || '';
    }

    // Handle conditional Caste / Category fields (SC/ST OTR vs Non-SC/ST Ration Card + CM Kisan)
    const catVal = document.getElementById('category')?.value || p.category || 'General';
    toggleCasteCategoryFields(catVal);

    // Handle conditional CM Kisan display
    const cmKisanVal = document.getElementById('hasCmKisan')?.value || p.hasCmKisan || 'No';
    toggleCmKisanFields(cmKisanVal);

    renderAdditionalFees();
    syncAllFieldsToStore();
    Store.saveLocally();
}

function renderAdditionalFees() {
    const container = document.getElementById('additional-fees-container');
    if (!container) return;

    if (!Store.data.fees) Store.data.fees = {};
    if (Store.data.fees.additionalFees === undefined) {
        const f = Store.data.fees;
        const initialFees = [];
        
        if (f.tuitionFeeAmount || f.tuitionReceiptNumber) {
            initialFees.push({ id: 'fee_tuition', feeType: 'Tuition Fee', amount: f.tuitionFeeAmount || '', receiptNumber: f.tuitionReceiptNumber || '', receiptDate: f.tuitionReceiptDate || '' });
        }
        if (f.hostelFeeAmount || f.hostelReceiptNumber) {
            initialFees.push({ id: 'fee_hostel', feeType: 'Hostel Fee', amount: f.hostelFeeAmount || '', receiptNumber: f.hostelReceiptNumber || '', receiptDate: f.hostelReceiptDate || '' });
        }
        if (f.transportFeeAmount || f.transportReceiptNumber) {
            initialFees.push({ id: 'fee_transport', feeType: 'Transport Fee', amount: f.transportFeeAmount || '', receiptNumber: f.transportReceiptNumber || '', receiptDate: f.transportReceiptDate || '' });
        }
        if (f.oneTimeFeeAmount || f.oneTimeFeeReceiptNumber) {
            initialFees.push({ id: 'fee_onetime', feeType: 'One Time Fee', amount: f.oneTimeFeeAmount || '', receiptNumber: f.oneTimeFeeReceiptNumber || '', receiptDate: f.oneTimeFeeReceiptDate || '' });
        }
        if (f.counsellingFeeAmount || f.counsellingFeeReceiptNumber) {
            initialFees.push({ id: 'fee_counselling', feeType: 'Counselling Fee', amount: f.counsellingFeeAmount || '', receiptNumber: f.counsellingFeeReceiptNumber || '', receiptDate: f.counsellingFeeReceiptDate || '' });
        }

        // Default to 1 initial entry for first-time view
        if (initialFees.length === 0) {
            initialFees.push({
                id: 'fee_' + Date.now(),
                feeType: 'Tuition Fee',
                amount: '',
                receiptNumber: '',
                receiptDate: ''
            });
        }

        Store.data.fees.additionalFees = initialFees;
        Store.save();
    }

    const fees = Store.data.fees.additionalFees || [];

    if (fees.length === 0) {
        container.innerHTML = `<p style="color: #64748b; font-size: 0.88rem; margin: 8px 0 16px 0; font-style: italic; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px dashed #cbd5e1;">No fee receipts added. If you have not paid any fee yet, you can skip this section.</p>`;
        return;
    }

    let html = '';
    fees.forEach((item, index) => {
        html += `
            <div class="additional-fee-card" data-id="${item.id}" style="margin-top: 14px; padding: 16px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                    <h5 style="margin: 0; color: #1e293b; font-weight: 600; font-size: 0.95rem;">Fee Receipt #${index + 1}</h5>
                    <button type="button" class="remove-fee-btn" data-id="${item.id}" style="background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; padding: 4px 10px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: background 0.2s;">
                        ✕ Remove
                    </button>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label class="form-label" for="add_feeType_${item.id}">Select Fee Type</label>
                        <select id="add_feeType_${item.id}" name="feeType" data-id="${item.id}" class="form-control add-fee-field">
                            <option value="" disabled ${!item.feeType ? 'selected' : ''}>Select Fee Type</option>
                            <option value="Tuition Fee" ${item.feeType === 'Tuition Fee' ? 'selected' : ''}>Tuition Fee</option>
                            <option value="Hostel Fee" ${item.feeType === 'Hostel Fee' ? 'selected' : ''}>Hostel Fee</option>
                            <option value="Transport Fee" ${item.feeType === 'Transport Fee' ? 'selected' : ''}>Transport Fee</option>
                            <option value="One Time Fee" ${item.feeType === 'One Time Fee' ? 'selected' : ''}>One Time Fee</option>
                            <option value="Counselling Fee" ${item.feeType === 'Counselling Fee' ? 'selected' : ''}>Counselling Fee</option>
                            <option value="Examination Fee" ${item.feeType === 'Examination Fee' ? 'selected' : ''}>Examination Fee</option>
                            <option value="Library Fee" ${item.feeType === 'Library Fee' ? 'selected' : ''}>Library Fee</option>
                            <option value="Uniform Fee" ${item.feeType === 'Uniform Fee' ? 'selected' : ''}>Uniform Fee</option>
                            <option value="Placement / Soft Skill Fee" ${item.feeType === 'Placement / Soft Skill Fee' ? 'selected' : ''}>Placement / Soft Skill Fee</option>
                            <option value="Other Fee" ${item.feeType === 'Other Fee' ? 'selected' : ''}>Other Fee</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="add_amount_${item.id}">Amount (₹)</label>
                        <input type="number" id="add_amount_${item.id}" name="amount" data-id="${item.id}" class="form-control add-fee-field" value="${item.amount || ''}" placeholder="e.g. 5000">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="add_receiptNumber_${item.id}">Receipt Number</label>
                        <input type="text" id="add_receiptNumber_${item.id}" name="receiptNumber" data-id="${item.id}" class="form-control add-fee-field" value="${item.receiptNumber || ''}" placeholder="Receipt No.">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="add_receiptDate_${item.id}">Receipt Date</label>
                        <input type="date" id="add_receiptDate_${item.id}" name="receiptDate" data-id="${item.id}" class="form-control add-fee-field" value="${item.receiptDate || ''}">
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    attachAdditionalFeeListeners();
}

function syncLegacyFees() {
    if (!Store.data.fees || !Store.data.fees.additionalFees) return;
    const fees = Store.data.fees.additionalFees;
    const f = Store.data.fees;

    f.tuitionFeeAmount = ''; f.tuitionReceiptNumber = ''; f.tuitionReceiptDate = '';
    f.hostelFeeAmount = ''; f.hostelReceiptNumber = ''; f.hostelReceiptDate = '';
    f.transportFeeAmount = ''; f.transportReceiptNumber = ''; f.transportReceiptDate = '';
    f.oneTimeFeeAmount = ''; f.oneTimeFeeReceiptNumber = ''; f.oneTimeFeeReceiptDate = '';
    f.counsellingFeeAmount = ''; f.counsellingFeeReceiptNumber = ''; f.counsellingFeeReceiptDate = '';

    fees.forEach(item => {
        if (item.feeType === 'Tuition Fee') {
            f.tuitionFeeAmount = item.amount || '';
            f.tuitionReceiptNumber = item.receiptNumber || '';
            f.tuitionReceiptDate = item.receiptDate || '';
        } else if (item.feeType === 'Hostel Fee') {
            f.hostelFeeAmount = item.amount || '';
            f.hostelReceiptNumber = item.receiptNumber || '';
            f.hostelReceiptDate = item.receiptDate || '';
        } else if (item.feeType === 'Transport Fee') {
            f.transportFeeAmount = item.amount || '';
            f.transportReceiptNumber = item.receiptNumber || '';
            f.transportReceiptDate = item.receiptDate || '';
        } else if (item.feeType === 'One Time Fee') {
            f.oneTimeFeeAmount = item.amount || '';
            f.oneTimeFeeReceiptNumber = item.receiptNumber || '';
            f.oneTimeFeeReceiptDate = item.receiptDate || '';
        } else if (item.feeType === 'Counselling Fee') {
            f.counsellingFeeAmount = item.amount || '';
            f.counsellingFeeReceiptNumber = item.receiptNumber || '';
            f.counsellingFeeReceiptDate = item.receiptDate || '';
        }
    });
}

function attachAdditionalFeeListeners() {
    document.querySelectorAll('.add-fee-field').forEach(el => {
        el.addEventListener('input', updateAdditionalFeeItem);
        el.addEventListener('change', updateAdditionalFeeItem);
    });

    document.querySelectorAll('.remove-fee-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            removeAdditionalFee(id);
        });
    });
}

function updateAdditionalFeeItem(e) {
    const id = e.target.getAttribute('data-id');
    const field = e.target.name;
    const val = e.target.value;

    if (!Store.data.fees) Store.data.fees = {};
    if (!Store.data.fees.additionalFees) Store.data.fees.additionalFees = [];

    const item = Store.data.fees.additionalFees.find(f => f.id === id);
    if (item) {
        item[field] = val;
        syncLegacyFees();
        Store.save();
    }
}

function addAdditionalFee() {
    if (!Store.data.fees) Store.data.fees = {};
    if (!Store.data.fees.additionalFees) Store.data.fees.additionalFees = [];

    const newFee = {
        id: 'fee_' + Date.now(),
        feeType: '',
        amount: '',
        receiptNumber: '',
        receiptDate: ''
    };

    Store.data.fees.additionalFees.push(newFee);
    Store.save();
    renderAdditionalFees();
}

function removeAdditionalFee(id) {
    if (!Store.data.fees || !Store.data.fees.additionalFees) return;
    Store.data.fees.additionalFees = Store.data.fees.additionalFees.filter(f => f.id !== id);
    syncLegacyFees();
    Store.save();
    renderAdditionalFees();
}

function setupListeners() {
    const form = document.getElementById('reporting-form');
    if (!form) return;

    const addFeeBtn = document.getElementById('add-fee-btn');
    if (addFeeBtn) {
        addFeeBtn.addEventListener('click', () => {
            addAdditionalFee();
        });
    }

    const programEl = document.getElementById('program');
    const admissionTypeEl = document.getElementById('admissionType');
    const stateEl = document.getElementById('state');

    if (programEl) {
        programEl.addEventListener('change', (e) => {
            const selectedProg = e.target.value;
            const currentAdmission = admissionTypeEl ? admissionTypeEl.value : 'Regular';
            updateAdmissionTypeOptions(selectedProg, currentAdmission);
            const updatedAdmission = admissionTypeEl ? admissionTypeEl.value : 'Regular';
            updateBranchOptions(selectedProg, '');
            updateAcademicOptions(selectedProg, updatedAdmission, '', '');
            
            const branchEl = document.getElementById('branch');
            const sessionEl = document.getElementById('academicSession');
            const yearEl = document.getElementById('academicYear');
            if (admissionTypeEl) saveField(admissionTypeEl);
            if (branchEl) saveField(branchEl);
            if (sessionEl) saveField(sessionEl);
            if (yearEl) saveField(yearEl);
        });
    }

    if (admissionTypeEl) {
        admissionTypeEl.addEventListener('change', (e) => {
            const currentProg = programEl ? programEl.value : 'B.Tech';
            const selectedAdmission = e.target.value;
            updateAcademicOptions(currentProg, selectedAdmission, '', '');

            const sessionEl = document.getElementById('academicSession');
            const yearEl = document.getElementById('academicYear');
            if (sessionEl) saveField(sessionEl);
            if (yearEl) saveField(yearEl);
        });
    }

    const admissionRefEl = document.getElementById('admissionReference');
    if (admissionRefEl) {
        admissionRefEl.addEventListener('change', (e) => {
            const val = e.target.value;
            toggleReferrerField(val);
            saveField(e.target);
            if (val === 'Referred by Person') {
                const refInput = document.getElementById('referrerName');
                if (refInput) {
                    refInput.focus();
                }
            } else {
                const refInput = document.getElementById('referrerName');
                if (refInput) {
                    refInput.value = '';
                    saveField(refInput);
                }
            }
        });
    }

    const categoryEl = document.getElementById('category');
    if (categoryEl) {
        categoryEl.addEventListener('change', (e) => {
            const val = e.target.value;
            toggleCasteCategoryFields(val);
            saveField(e.target);
            syncAllFieldsToStore();
            Store.saveLocally();
        });
    }

    const hasCmKisanEl = document.getElementById('hasCmKisan');
    if (hasCmKisanEl) {
        hasCmKisanEl.addEventListener('change', (e) => {
            const val = e.target.value;
            toggleCmKisanFields(val);
            saveField(e.target);
            syncAllFieldsToStore();
            Store.saveLocally();
        });
    }

    if (stateEl) {
        stateEl.addEventListener('change', (e) => {
            const selectedState = e.target.value;
            updateDistrictOptions(selectedState, '');

            const districtEl = document.getElementById('district');
            if (districtEl) saveField(districtEl);
        });
    }

    form.addEventListener('input', (e) => {
        if (e.target.type !== 'file') {
            saveField(e.target);
        }
    });

    form.addEventListener('change', (e) => {
        if (e.target.tagName === 'SELECT' || e.target.type === 'radio') {
            saveField(e.target);
        }
    });

    const saveBtn = document.getElementById('save-draft-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            syncAllFieldsToStore();
            Store.save();
            alert('Draft saved successfully!');
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        syncAllFieldsToStore();
        if (validateForm()) {
            Store.save();
            window.dispatchEvent(new CustomEvent('navigate-step', { detail: { nextStep: 'documents' } }));
        }
    });
}

function syncAllFieldsToStore() {
    const form = document.getElementById('reporting-form');
    if (!form) return;
    form.querySelectorAll('input:not([type="file"]), select, textarea').forEach(el => {
        if (el.name) saveField(el);
    });
}

function saveField(element) {
    let val = element.value;
    if (element.type === 'text' || element.type === 'email') {
        val = val.replace(/\s{2,}/g, ' ');
        element.value = val; 
    }
    
    const name = element.name || element.id;
    if (!name) return;

    const trimmed = typeof val === 'string' ? val.trim() : val;
    const targetSection = FIELD_SECTION_MAP[name];

    if (targetSection) {
        Store.update(targetSection, name, trimmed);
    } else {
        const data = Store.data;
        for (const section in data) {
            if (data[section] && typeof data[section] === 'object' && name in data[section]) {
                Store.update(section, name, trimmed);
                break;
            }
        }
    }
}

function validateForm() {
    const form = document.getElementById('reporting-form');
    let isValid = true;

    document.querySelectorAll('.validation-message').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.form-control').forEach(el => el.style.borderColor = 'var(--border-color)');

    if (!form.checkValidity()) {
        form.querySelectorAll(':invalid').forEach(el => {
            if (el.id) {
                el.style.borderColor = 'var(--danger)';
                const err = document.getElementById(`${el.id}-error`);
                if (err) {
                    err.textContent = 'This field is required.';
                    err.style.display = 'block';
                }
            }
        });
        isValid = false;
    }

    const aadhaar = document.getElementById('aadhaarNumber');
    if (aadhaar && aadhaar.value && !/^\d{12}$/.test(aadhaar.value.trim())) {
        showError('aadhaarNumber', 'Aadhaar must be exactly 12 digits');
        isValid = false;
    }

    const categoryVal = document.getElementById('category')?.value;
    const isScSt = (categoryVal === 'SC' || categoryVal === 'ST');

    if (!isScSt) {
        const hasCmKisan = document.getElementById('hasCmKisan')?.value;
        if (hasCmKisan === 'Yes') {
            const benId = document.getElementById('cmKisanBeneficiaryId');
            const benName = document.getElementById('cmKisanBeneficiaryName');
            const benAadhaar = document.getElementById('cmKisanBeneficiaryAadhaar');

            if (!benId || !benId.value.trim()) {
                showError('cmKisanBeneficiaryId', 'CM Kisan Beneficiary ID is required.');
                isValid = false;
            }
            if (!benName || !benName.value.trim()) {
                showError('cmKisanBeneficiaryName', 'Beneficiary Name is required.');
                isValid = false;
            }
            if (!benAadhaar || !benAadhaar.value.trim()) {
                showError('cmKisanBeneficiaryAadhaar', 'Beneficiary Aadhaar number is required.');
                isValid = false;
            } else if (!/^\d{12}$/.test(benAadhaar.value.trim())) {
                showError('cmKisanBeneficiaryAadhaar', 'Beneficiary Aadhaar must be exactly 12 digits');
                isValid = false;
            }
        }
    }

    const phones = ['studentMobile', 'whatsappNumber', 'fatherMobile', 'motherMobile'];
    phones.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value && !/^\d{10}$/.test(el.value.trim())) {
            showError(id, 'Phone must be exactly 10 digits');
            isValid = false;
        }
    });

    if (!isValid) {
        alert('Please complete all required fields correctly before proceeding to Documents.');
    }
    return isValid;
}

function showError(id, message) {
    const el = document.getElementById(id);
    if (el) el.style.borderColor = 'var(--danger)';
    const err = document.getElementById(`${id}-error`);
    if (err) {
        err.textContent = message;
        err.style.display = 'block';
    }
}
