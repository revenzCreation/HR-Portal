const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMtnoAr3Y8Y8JNsWcUw_Lyv1-lEU_9-QlVExhpqBhHUjseiUz97wyxD6fCnvsRSmrT/exec';
const form = document.getElementById('referralForm');

// ==========================================
// VIEW NAVIGATION & FOCUS MANAGEMENT
// ==========================================
const landingView = document.getElementById('landingView');
const formView = document.getElementById('formView');

document.getElementById('startReferralBtn').addEventListener('click', () => {
  landingView.classList.replace('active', 'hidden');
  setTimeout(() => {
    formView.classList.replace('hidden', 'active');
    document.getElementById('referrerName').focus();
  }, 150);
});

document.getElementById('backBtn').addEventListener('click', () => {
  formView.classList.replace('active', 'hidden');
  setTimeout(() => {
    landingView.classList.replace('hidden', 'active');
  }, 150);
});

// ==========================================
// STATE PERSISTENCE (AUTO-SAVE DRAFT)
// ==========================================
const saveDraft = () => {
  const draft = {};
  const inputs = form.querySelectorAll('input:not([type="file"]), select, textarea');
  inputs.forEach(input => { draft[input.id] = input.value; });
  localStorage.setItem('referralDraft', JSON.stringify(draft));
};

const debounce = (func, delay = 500) => {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => { func.apply(this, args); }, delay); };
};

form.addEventListener('input', debounce(saveDraft, 800));
form.addEventListener('change', saveDraft);

document.addEventListener('DOMContentLoaded', () => {
  const draftData = localStorage.getItem('referralDraft');
  if (draftData) {
    const draft = JSON.parse(draftData);
    Object.keys(draft).forEach(key => {
      const field = document.getElementById(key);
      if (field) field.value = draft[key];
    });
    checkOtherDeptVisibility();
    checkOtherRelationshipVisibility();
    updateProgress();
  }
});

// ==========================================
// "OTHER" DEPARTMENT & RELATIONSHIP LOGIC
// ==========================================
const deptSelect = document.getElementById('referrerDepartment');
const otherDeptGroup = document.getElementById('otherDeptGroup');
const otherDeptInput = document.getElementById('otherDepartment');

function checkOtherDeptVisibility() {
  if (deptSelect.value === 'Other') {
    otherDeptGroup.classList.add('show');
    otherDeptInput.setAttribute('required', 'true');
  } else {
    otherDeptGroup.classList.remove('show');
    otherDeptInput.removeAttribute('required');
    otherDeptInput.value = '';
    otherDeptGroup.classList.remove('invalid');
  }
}
deptSelect.addEventListener('change', checkOtherDeptVisibility);

const relationshipSelect = document.getElementById('relationship');
const otherRelationshipGroup = document.getElementById('otherRelationshipGroup');
const otherRelationshipInput = document.getElementById('otherRelationship');

function checkOtherRelationshipVisibility() {
  if (relationshipSelect.value === 'Other') {
    otherRelationshipGroup.classList.add('show');
    otherRelationshipInput.setAttribute('required', 'true');
  } else {
    otherRelationshipGroup.classList.remove('show');
    otherRelationshipInput.removeAttribute('required');
    otherRelationshipInput.value = '';
    otherRelationshipGroup.classList.remove('invalid');
  }
}
relationshipSelect.addEventListener('change', checkOtherRelationshipVisibility);

// ==========================================
// INTERACTIVE INPUT MASKING (PHONE)
// ==========================================
const phoneInput = document.getElementById('candidatePhone');
phoneInput.addEventListener('input', (e) => {
  let val = e.target.value.replace(/\D/g, '');
  if (val.length > 11) val = val.substring(0, 11);
  
  let formatted = val;
  if (val.length > 4) formatted = val.substring(0, 4) + ' ' + val.substring(4);
  if (val.length > 7) formatted = formatted.substring(0, 8) + ' ' + formatted.substring(8);
  e.target.value = formatted;
});

// ==========================================
// MULTI-STEP WIZARD LOGIC
// ==========================================
const steps = ['step1', 'step2', 'step3'];
let currentStepIndex = 0;

document.querySelectorAll('.next-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const targetStepId = e.target.getAttribute('data-next');
    if (validateStep(steps[currentStepIndex])) {
      transitionStep(steps[currentStepIndex], targetStepId);
      currentStepIndex++;
    }
  });
});

document.querySelectorAll('.prev-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const targetStepId = e.target.getAttribute('data-prev');
    transitionStep(steps[currentStepIndex], targetStepId);
    currentStepIndex--;
  });
});

function transitionStep(currentId, nextId) {
  const currentStep = document.getElementById(currentId);
  const nextStep = document.getElementById(nextId);
  
  currentStep.classList.replace('active', 'hidden');
  nextStep.classList.replace('hidden', 'active');
  
  const firstInput = nextStep.querySelector('input, select, textarea');
  if (firstInput) firstInput.focus();
}

// ==========================================
// REAL-TIME & STEP VALIDATION
// ==========================================
function validateField(input) {
  const group = input.closest('.form-group');
  let isValid = true;
  let customError = "";

  if (input.hasAttribute('required') && !input.value.trim()) {
    isValid = false;
  } else if (input.value.trim()) {
    
    // GMAIL FORMAT VALIDATION FOR REFERRER
    if (input.id === 'referrerEmail') {
      const gmailRegex = /^[a-z0-9._%+-]+@gmail\.com$/;
      if (!gmailRegex.test(input.value.trim().toLowerCase())) {
        isValid = false; customError = "Must be a valid @gmail.com address.";
      }
    }
    
    // GMAIL FORMAT VALIDATION FOR CANDIDATE
    if (input.id === 'candidateEmail') {
      const gmailRegex = /^[a-z0-9._%+-]+@gmail\.com$/;
      if (!gmailRegex.test(input.value.trim().toLowerCase())) {
        isValid = false; customError = "Candidate email must end with @gmail.com.";
      }
    }
    
    if (input.id === 'candidatePhone') {
      const rawPhone = input.value.replace(/\s/g, '');
      const phoneRegex = /^09\d{9}$/;
      if (!phoneRegex.test(rawPhone)) {
        isValid = false; customError = "Must be exactly 11 digits starting with 09.";
      }
    }
  }

  if (!isValid) {
    group.classList.add('invalid');
    if (customError && group.querySelector('.error-msg')) {
      group.querySelector('.error-msg').textContent = customError;
    }
  } else {
    group.classList.remove('invalid');
  }
  return isValid;
}

form.querySelectorAll('input, select, textarea').forEach(input => {
  input.addEventListener('blur', () => validateField(input));
});

function validateStep(stepId) {
  const step = document.getElementById(stepId);
  const inputs = step.querySelectorAll('input, select, textarea');
  let isStepValid = true;

  inputs.forEach(input => {
    const group = input.closest('.form-group');
    if (group && group.classList.contains('hidden-dept') && !group.classList.contains('show')) return;
    if (!validateField(input)) isStepValid = false;
  });

  return isStepValid;
}

// ==========================================
// ADVANCED FILE UPLOAD HANDLING
// ==========================================
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('resume');
const filePreview = document.getElementById('filePreview');
const fileName = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFileBtn');
const dropZoneContent = document.getElementById('dropZoneContent');
const resumeGroup = document.getElementById('resumeGroup');
const fileError = document.getElementById('fileError');

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

['dragenter', 'dragover'].forEach(eName => dropZone.addEventListener(eName, e => { e.preventDefault(); dropZone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(eName => dropZone.addEventListener(eName, e => { e.preventDefault(); dropZone.classList.remove('dragover'); }));

fileInput.addEventListener('change', handleFileSelect);
removeFileBtn.addEventListener('click', clearFile);

function clearFile(e) {
  if (e) e.stopPropagation();
  fileInput.value = '';
  filePreview.classList.add('hidden');
  dropZoneContent.classList.remove('hidden');
  resumeGroup.classList.add('invalid');
  fileError.textContent = "Please upload a valid resume file under 5MB.";
  updateProgress();
}

function handleFileSelect() {
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    
    if (file.size > MAX_FILE_SIZE) {
      clearFile();
      fileError.textContent = "File exceeds 5MB limit. Please compress and try again.";
      resumeGroup.classList.add('invalid');
      return;
    }
    
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
      clearFile();
      fileError.textContent = "Invalid file type. Only PDF, DOC, or DOCX allowed.";
      resumeGroup.classList.add('invalid');
      return;
    }

    fileName.textContent = file.name;
    dropZoneContent.classList.add('hidden');
    filePreview.classList.remove('hidden');
    resumeGroup.classList.remove('invalid');
  } else {
    resumeGroup.classList.add('invalid');
  }
  updateProgress();
}

// ==========================================
// PROGRESS BAR & CHAR COUNTER
// ==========================================
const notesArea = document.getElementById('notes');
const charCount = document.getElementById('charCount');
notesArea.addEventListener('input', () => { charCount.textContent = notesArea.value.length; });

function updateProgress() {
  const allRequired = Array.from(document.querySelectorAll('#referralForm [required]'));
  const activeRequired = allRequired.filter(input => {
    const group = input.closest('.form-group');
    if (group && group.classList.contains('hidden-dept') && !group.classList.contains('show')) {
      return false;
    }
    return input.hasAttribute('required');
  });
  
  let filled = 0;
  activeRequired.forEach(input => {
    if (input.type === 'file' && input.files.length > 0) filled++;
    else if (input.type !== 'file' && input.value.trim() !== '') filled++;
  });
  
  const percent = activeRequired.length > 0 ? (filled / activeRequired.length) * 100 : 0;
  document.getElementById('progressBar').style.width = `${percent}%`;
}

form.addEventListener('input', updateProgress);
form.addEventListener('change', updateProgress);

// ==========================================
// FORM SUBMISSION
// ==========================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('submitBtn');
  const spinner = document.getElementById('loadingSpinner');
  const statusDiv = document.getElementById('statusMessage');

  if (!validateStep('step3')) {
    statusDiv.textContent = "Please fix the highlighted errors before submitting.";
    statusDiv.className = 'status-box error';
    return;
  }

  submitBtn.disabled = true;
  spinner.classList.remove('hidden');
  statusDiv.className = 'status-box hidden';

  const finalDept = deptSelect.value === 'Other' ? otherDeptInput.value.trim() : deptSelect.value;
  const finalRelationship = relationshipSelect.value === 'Other' ? otherRelationshipInput.value.trim() : relationshipSelect.value;
  const rawPhone = phoneInput.value.replace(/\s/g, '');
  const file = fileInput.files[0];
  
  const submitData = async (fileData = null, fileNameStr = '', mimeTypeStr = '') => {
    const payload = {
      referrerName: form.referrerName.value.trim(),
      referrerEmail: form.referrerEmail.value.trim(),
      referrerDepartment: finalDept,
      candidateName: form.candidateName.value.trim(),
      candidateEmail: form.candidateEmail.value.trim(),
      candidatePhone: rawPhone,
      candidatePortfolio: form.candidatePortfolio.value.trim() || 'N/A',
      targetRole: form.targetRole.value.trim(),
      relationship: finalRelationship,
      notes: form.notes.value.trim() || 'None provided',
      hasFile: !!fileData,
      fileName: fileNameStr,
      mimeType: mimeTypeStr,
      fileData: fileData
    };

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain' }
      });

      localStorage.removeItem('referralDraft');
      
      statusDiv.textContent = "Referral successfully submitted. A copy has been dispatched to your email.";
      statusDiv.className = 'status-box success';
      
      form.reset();
      clearFile();
      checkOtherDeptVisibility();
      checkOtherRelationshipVisibility();
      charCount.textContent = '0';
      document.getElementById('progressBar').style.width = '0%';
      
      // Fix: Reset step index back to 0 so subsequent form submissions work seamlessly
      currentStepIndex = 0;
      
      setTimeout(() => {
        transitionStep('step3', 'step1');
        submitBtn.disabled = false;
      }, 2000);

    } catch (err) {
      statusDiv.textContent = 'Network error. Unable to complete submission at this time.';
      statusDiv.className = 'status-box error';
      submitBtn.disabled = false;
    } finally {
      spinner.classList.add('hidden');
    }
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result.split(',')[1];
      submitData(base64Data, file.name, file.type);
    };
    reader.readAsDataURL(file);
  } else {
    submitData();
  }
});