import { Store } from './store.js';

const steps = ['reporting', 'documents', 'facilities', 'hostel', 'transport', 'antiragging'];

document.addEventListener('DOMContentLoaded', () => {
    // Check for target step in URL
    const urlParams = new URLSearchParams(window.location.search);
    const targetStep = urlParams.get('step');
    
    if (targetStep && steps.includes(targetStep)) {
        updateStepView(targetStep);
    } else {
        updateStepView('reporting');
    }

    // Facilities selection form submission handler
    const facilitiesForm = document.getElementById('facilities-form');
    if (facilitiesForm) {
        // Load initial selections
        const hostelVal = Store.data.facilities?.hostelRequired || Store.data.reporting?.hostelRequired || 'No';
        const transVal = Store.data.facilities?.transportRequired || Store.data.reporting?.transportRequired || 'No';
        
        const hostelRad = facilitiesForm.querySelector(`input[name="facilityHostel"][value="${hostelVal}"]`);
        if (hostelRad) hostelRad.checked = true;

        const transRad = facilitiesForm.querySelector(`input[name="facilityTransport"][value="${transVal}"]`);
        if (transRad) transRad.checked = true;

        facilitiesForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const hReq = facilitiesForm.querySelector('input[name="facilityHostel"]:checked')?.value || 'No';
            const tReq = facilitiesForm.querySelector('input[name="facilityTransport"]:checked')?.value || 'No';

            Store.update('facilities', 'hostelRequired', hReq);
            Store.update('facilities', 'transportRequired', tReq);
            Store.update('reporting', 'hostelRequired', hReq);
            Store.update('reporting', 'transportRequired', tReq);
            Store.save();

            // Route dynamically based on choices:
            if (hReq === 'Yes') {
                updateStepView('hostel');
            } else if (tReq === 'Yes') {
                updateStepView('transport');
            } else {
                updateStepView('antiragging');
            }
            window.scrollTo(0, 0);
        });
    }

    // Custom step navigation events
    window.addEventListener('navigate-step', (e) => {
        if (e.detail && e.detail.nextStep) {
            updateStepView(e.detail.nextStep);
            window.scrollTo(0, 0);
        }
    });

    // Allow direct navigation via step header clicks to view all form sections
    steps.forEach(s => {
        const navEl = document.getElementById(`step-nav-${s}`);
        if (navEl) {
            navEl.addEventListener('click', () => {
                Store.syncDOMInputs();
                Store.save();
                updateStepView(s);
                window.scrollTo(0, 0);
            });
        }
    });

    // Handle back buttons
    document.querySelectorAll('.stepper-back-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            Store.syncDOMInputs();
            Store.save();
            const backTarget = e.target.getAttribute('data-back');
            if (backTarget) {
                handleBackNavigation(backTarget);
            }
        });
    });
});

function handleBackNavigation(intendedTarget) {
    Store.syncDOMInputs();
    Store.save();
    const hReq = Store.data.facilities?.hostelRequired || Store.data.reporting?.hostelRequired || 'No';
    const tReq = Store.data.facilities?.transportRequired || Store.data.reporting?.transportRequired || 'No';
    
    let finalTarget = intendedTarget;

    if (intendedTarget === 'antiragging' || intendedTarget === 'facilities') {
        if (tReq === 'Yes') finalTarget = 'transport';
        else if (hReq === 'Yes') finalTarget = 'hostel';
        else finalTarget = 'facilities';
    }

    updateStepView(finalTarget);
    window.scrollTo(0, 0);
}

export function updateStepView(targetStepId) {
    Store.syncDOMInputs();
    Store.save();

    // Hide all contents
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show target content
    const targetContent = document.getElementById(`step-${targetStepId}`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Dynamic nav tab visibility for Hostel & Transport
    const hReq = Store.data.facilities?.hostelRequired || Store.data.reporting?.hostelRequired || 'No';
    const tReq = Store.data.facilities?.transportRequired || Store.data.reporting?.transportRequired || 'No';

    const hostelNav = document.getElementById('step-nav-hostel');
    if (hostelNav) hostelNav.style.display = (hReq === 'Yes') ? 'flex' : 'none';

    const transportNav = document.getElementById('step-nav-transport');
    if (transportNav) transportNav.style.display = (tReq === 'Yes') ? 'flex' : 'none';

    // Update Back button for Anti-Ragging dynamically
    const arBackBtn = document.getElementById('ar-back-btn');
    if (arBackBtn) {
        if (tReq === 'Yes') arBackBtn.setAttribute('data-back', 'transport');
        else if (hReq === 'Yes') arBackBtn.setAttribute('data-back', 'hostel');
        else arBackBtn.setAttribute('data-back', 'facilities');
    }

    // Update Stepper UI
    const visibleSteps = steps.filter(s => {
        if (s === 'hostel') return hReq === 'Yes';
        if (s === 'transport') return tReq === 'Yes';
        return true;
    });

    const targetIndex = visibleSteps.indexOf(targetStepId);
    
    visibleSteps.forEach((step, index) => {
        const stepNav = document.getElementById(`step-nav-${step}`);
        if (!stepNav) return;
        
        if (index < targetIndex) {
            stepNav.classList.remove('active');
            stepNav.classList.add('completed');
        } else if (index === targetIndex) {
            stepNav.classList.add('active');
            stepNav.classList.remove('completed');
        } else {
            stepNav.classList.remove('active');
            stepNav.classList.remove('completed');
        }
    });
    
    const progressPercent = targetIndex >= 0 ? (targetIndex / (visibleSteps.length - 1)) * 100 : 0;
    const progEl = document.getElementById('stepper-progress');
    if (progEl) progEl.style.width = `${progressPercent}%`;

    // Dispatch step-active notification so step modules re-bind latest Store.data
    window.dispatchEvent(new CustomEvent('step-active', { detail: { step: targetStepId, nextStep: targetStepId } }));
}
