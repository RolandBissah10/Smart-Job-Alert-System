import { useState, useEffect, useRef } from 'react';
import { getMe, updateProfile, resetProfile, uploadCv, deleteCv, updateMatchSource } from '../../services/api';
import { CheckCircle, ChevronRight, ChevronLeft, ChevronDown } from 'lucide-react';
import useCompanySearch from '../../hooks/useCompanySearch';
import ChipInput from '../../components/ChipInput';

const COMPANIES_PER_PAGE = 5;

const INDUSTRIES = [
  { value: 'technology', label: 'Technology & Software' },
  { value: 'healthcare', label: 'Healthcare & Medicine' },
  { value: 'finance', label: 'Finance & Accounting' },
  { value: 'marketing', label: 'Marketing & Sales' },
  { value: 'education', label: 'Education & Training' },
  { value: 'legal', label: 'Legal & Compliance' },
  { value: 'design', label: 'Design & Creative' },
  { value: 'engineering', label: 'Engineering (Non-Software)' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'operations', label: 'Operations & Logistics' },
  { value: 'research', label: 'Research & Science' },
  { value: 'customer_service', label: 'Customer Service' },
];

const INDUSTRY_SKILLS = {
  technology: [
    { label: 'Languages', items: ['Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust', 'C#', 'C++', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Scala', 'Dart', 'R'] },
    { label: 'Frontend', items: ['React', 'Vue', 'Angular', 'Next.js', 'Tailwind CSS'] },
    { label: 'Backend', items: ['Django', 'FastAPI', 'Flask', 'Node.js', 'Express.js', 'NestJS', 'Spring Boot', 'Laravel', 'Ruby on Rails', 'ASP.NET'] },
    { label: 'DevOps & Cloud', items: ['Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'Jenkins', 'CI/CD', 'Linux', 'Nginx'] },
    { label: 'Databases', items: ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'SQLite', 'Kafka'] },
    { label: 'Mobile', items: ['Flutter', 'React Native', 'iOS', 'Android'] },
    { label: 'Testing', items: ['Selenium', 'Playwright', 'Cypress', 'PyTest', 'JUnit'] },
    { label: 'Cybersecurity', items: ['Kali Linux', 'Penetration Testing', 'Wireshark', 'Burp Suite', 'Network Security', 'OSINT', 'Metasploit', 'Splunk'] },
    { label: 'AI & Data', items: ['Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'SQL', 'Tableau', 'Power BI', 'scikit-learn'] },
  ],
  healthcare: [
    { label: 'Clinical Skills', items: ['Patient Care', 'Clinical Assessment', 'Diagnosis', 'Treatment Planning', 'Telemedicine', 'CPR', 'Wound Care'] },
    { label: 'Medical Specialties', items: ['Nursing', 'Surgery', 'Radiology', 'Pharmacy', 'Physical Therapy', 'Occupational Therapy', 'Mental Health', 'Pediatrics', 'Oncology'] },
    { label: 'Healthcare IT', items: ['EHR Systems', 'Epic', 'Cerner', 'HIPAA Compliance', 'HL7', 'FHIR', 'Medical Coding'] },
    { label: 'Research & Lab', items: ['Clinical Research', 'Biostatistics', 'Laboratory Testing', 'Medical Writing', 'IRB Protocols'] },
  ],
  finance: [
    { label: 'Accounting', items: ['GAAP', 'IFRS', 'Financial Reporting', 'Tax Preparation', 'Auditing', 'Bookkeeping', 'QuickBooks', 'SAP'] },
    { label: 'Finance', items: ['Financial Analysis', 'Valuation', 'Budgeting', 'Forecasting', 'Investment Analysis', 'Risk Management', 'M&A'] },
    { label: 'Banking', items: ['Commercial Banking', 'Retail Banking', 'Credit Analysis', 'Loan Processing', 'AML', 'KYC', 'Basel III'] },
    { label: 'Tools', items: ['Excel', 'Bloomberg', 'Python', 'SQL', 'Tableau', 'Power BI', 'VBA'] },
    { label: 'Certifications', items: ['CPA', 'CFA', 'CMA', 'FRM', 'CFP', 'ACCA'] },
  ],
  marketing: [
    { label: 'Digital Marketing', items: ['SEO', 'SEM', 'Google Ads', 'Facebook Ads', 'Email Marketing', 'Content Marketing', 'Affiliate Marketing'] },
    { label: 'Social Media', items: ['Social Media Management', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'X (Twitter)'] },
    { label: 'Analytics', items: ['Google Analytics', 'HubSpot', 'Salesforce', 'CRM', 'A/B Testing', 'Data Analysis', 'Hotjar'] },
    { label: 'Sales', items: ['B2B Sales', 'B2C Sales', 'Sales Strategy', 'Lead Generation', 'Account Management', 'Cold Calling', 'Negotiation'] },
    { label: 'Brand & Content', items: ['Brand Strategy', 'Copywriting', 'Content Creation', 'PR', 'Influencer Marketing', 'Market Research'] },
  ],
  education: [
    { label: 'Teaching', items: ['Curriculum Development', 'Lesson Planning', 'Classroom Management', 'E-Learning', 'LMS', 'Differentiated Instruction'] },
    { label: 'Levels', items: ['Early Childhood', 'K-12', 'Higher Education', 'Adult Education', 'Corporate Training', 'Special Education'] },
    { label: 'Subjects', items: ['STEM', 'Mathematics', 'Science', 'English', 'History', 'Arts', 'Physical Education', 'Languages'] },
    { label: 'Ed-Tech', items: ['Instructional Design', 'Moodle', 'Canvas', 'Zoom', 'Google Classroom', 'Articulate 360'] },
  ],
  legal: [
    { label: 'Practice Areas', items: ['Corporate Law', 'Criminal Law', 'Family Law', 'Immigration Law', 'Intellectual Property', 'Real Estate Law', 'Labor Law', 'Tax Law', 'Litigation'] },
    { label: 'Skills', items: ['Legal Research', 'Contract Drafting', 'Compliance', 'Negotiation', 'Legal Writing', 'Due Diligence', 'eDiscovery'] },
    { label: 'Tools', items: ['Westlaw', 'LexisNexis', 'PACER', 'Clio', 'DocuSign', 'Relativity'] },
  ],
  design: [
    { label: 'UI/UX', items: ['Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'Wireframing', 'User Research', 'Usability Testing', 'Design Systems'] },
    { label: 'Graphic Design', items: ['Adobe Photoshop', 'Illustrator', 'InDesign', 'After Effects', 'Branding', 'Typography', 'Print Design'] },
    { label: 'Motion & Video', items: ['Video Editing', 'Motion Graphics', 'Premiere Pro', 'Final Cut Pro', 'Animation', '3D Modeling', 'Blender'] },
    { label: 'Other Disciplines', items: ['Photography', 'Interior Design', 'Fashion Design', 'Product Design', 'Packaging Design'] },
  ],
  engineering: [
    { label: 'Mechanical', items: ['AutoCAD', 'SolidWorks', 'CATIA', 'FEA', 'CFD', 'Thermodynamics', 'Manufacturing', 'GD&T'] },
    { label: 'Civil & Structural', items: ['Structural Analysis', 'AutoCAD Civil 3D', 'Revit', 'Construction Management', 'BIM', 'Geotechnical'] },
    { label: 'Electrical', items: ['PCB Design', 'Embedded Systems', 'MATLAB', 'PLC Programming', 'Circuit Design', 'Power Systems', 'VHDL'] },
    { label: 'Chemical & Process', items: ['Process Engineering', 'Aspen Plus', 'Six Sigma', 'Quality Control', 'HSE', 'Piping Design'] },
  ],
  hr: [
    { label: 'Recruitment', items: ['Talent Acquisition', 'Sourcing', 'Interviewing', 'Employer Branding', 'ATS', 'LinkedIn Recruiter', 'Job Posting'] },
    { label: 'HR Operations', items: ['Onboarding', 'Employee Relations', 'Performance Management', 'HR Policies', 'Payroll', 'Benefits Administration', 'HRIS'] },
    { label: 'L&D', items: ['Training & Development', 'Learning Management', 'Leadership Development', 'Coaching', 'Succession Planning'] },
    { label: 'Tools', items: ['SAP SuccessFactors', 'Workday', 'BambooHR', 'ADP', 'Greenhouse', 'Lever'] },
  ],
  operations: [
    { label: 'Supply Chain', items: ['Supply Chain Management', 'Logistics', 'Procurement', 'Inventory Management', 'SAP', 'ERP', 'Vendor Management'] },
    { label: 'Project Management', items: ['Agile', 'Scrum', 'Kanban', 'PMP', 'Jira', 'Asana', 'Risk Management', 'Stakeholder Management'] },
    { label: 'Quality & Process', items: ['Six Sigma', 'Lean', 'ISO Standards', 'Quality Assurance', 'Process Improvement', 'Kaizen'] },
  ],
  research: [
    { label: 'Methods', items: ['Quantitative Research', 'Qualitative Research', 'Statistical Analysis', 'Survey Design', 'Data Collection', 'Meta-Analysis'] },
    { label: 'Tools', items: ['SPSS', 'STATA', 'R', 'Python', 'NVivo', 'MATLAB', 'SAS'] },
    { label: 'Fields', items: ['Biology', 'Chemistry', 'Physics', 'Social Sciences', 'Economics', 'Environmental Science', 'Clinical Research', 'Neuroscience'] },
  ],
  customer_service: [
    { label: 'Skills', items: ['Customer Support', 'CRM', 'Conflict Resolution', 'Communication', 'Zendesk', 'Salesforce', 'Live Chat', 'Ticketing Systems'] },
    { label: 'Channels', items: ['Phone Support', 'Email Support', 'Social Media Support', 'Chat Support', 'Technical Support'] },
  ],
};

const INDUSTRY_ROLES = {
  technology: [
    'Backend Developer', 'Frontend Developer', 'Full Stack Developer', 'Mobile Developer',
    'DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer', 'Platform Engineer',
    'Data Engineer', 'Data Scientist', 'ML Engineer', 'AI Engineer',
    'QA Engineer', 'Security Engineer', 'Penetration Tester', 'Security Analyst',
    'Product Manager', 'Technical Writer', 'Solutions Architect', 'Software Architect',
  ],
  healthcare: [
    'Registered Nurse', 'Physician', 'Medical Assistant', 'Pharmacist',
    'Physical Therapist', 'Occupational Therapist', 'Radiologist', 'Radiographer',
    'Clinical Researcher', 'Healthcare Administrator', 'Health Informatics Specialist',
    'Mental Health Counselor', 'Surgeon', 'Pediatrician', 'General Practitioner',
    'Medical Lab Technician', 'Dental Hygienist', 'Nutritionist',
  ],
  finance: [
    'Accountant', 'Financial Analyst', 'Auditor', 'Tax Specialist', 'Tax Accountant',
    'Investment Banker', 'Financial Advisor', 'Risk Analyst', 'Risk Manager',
    'Credit Analyst', 'Compliance Officer', 'Actuary', 'Underwriter',
    'Portfolio Manager', 'Treasury Analyst', 'Budget Analyst', 'Controller',
  ],
  marketing: [
    'Digital Marketing Manager', 'SEO Specialist', 'Content Writer', 'Copywriter',
    'Social Media Manager', 'Brand Manager', 'Marketing Analyst', 'Growth Marketer',
    'Sales Representative', 'Account Executive', 'Business Development Manager',
    'Email Marketing Specialist', 'Product Marketing Manager', 'PR Specialist',
  ],
  education: [
    'Teacher', 'Lecturer', 'Professor', 'Instructional Designer',
    'E-Learning Developer', 'School Counselor', 'Education Coordinator',
    'Curriculum Developer', 'Corporate Trainer', 'Tutor', 'Academic Advisor',
    'Special Education Teacher', 'School Principal', 'Education Consultant',
  ],
  legal: [
    'Lawyer', 'Attorney', 'Paralegal', 'Legal Counsel', 'General Counsel',
    'Compliance Officer', 'Contract Manager', 'Legal Analyst', 'Legal Assistant',
    'Corporate Counsel', 'Litigation Attorney', 'Immigration Lawyer', 'Patent Attorney',
  ],
  design: [
    'UI Designer', 'UX Designer', 'Product Designer', 'Graphic Designer',
    'Motion Designer', 'Video Editor', 'Creative Director', 'Art Director',
    'Brand Designer', 'Web Designer', '3D Artist', 'Illustrator',
    'Visual Designer', 'Interaction Designer', 'UX Researcher',
  ],
  engineering: [
    'Mechanical Engineer', 'Civil Engineer', 'Electrical Engineer', 'Chemical Engineer',
    'Structural Engineer', 'Process Engineer', 'Manufacturing Engineer',
    'Quality Engineer', 'Systems Engineer', 'Environmental Engineer',
    'Aerospace Engineer', 'Biomedical Engineer', 'Petroleum Engineer',
  ],
  hr: [
    'HR Manager', 'Recruiter', 'Talent Acquisition Specialist', 'HR Business Partner',
    'Compensation & Benefits Analyst', 'Learning & Development Specialist',
    'HR Generalist', 'People Operations Manager', 'Payroll Specialist',
    'Employee Experience Manager', 'HR Director', 'Organizational Development Consultant',
  ],
  operations: [
    'Operations Manager', 'Supply Chain Manager', 'Logistics Coordinator',
    'Project Manager', 'Product Owner', 'Scrum Master', 'Program Manager',
    'Process Improvement Analyst', 'Procurement Specialist', 'Business Analyst',
    'Warehouse Manager', 'Fleet Manager', 'Operations Analyst',
  ],
  research: [
    'Research Scientist', 'Data Analyst', 'Research Analyst', 'Principal Investigator',
    'Biomedical Researcher', 'Environmental Scientist', 'Economist', 'Statistician',
    'Social Researcher', 'Lab Technician', 'Postdoctoral Researcher', 'Research Associate',
  ],
  customer_service: [
    'Customer Support Specialist', 'Customer Success Manager', 'Support Team Lead',
    'Call Center Agent', 'Technical Support Specialist', 'Account Manager',
    'Client Relations Manager', 'Customer Experience Manager', 'Help Desk Analyst',
  ],
};

const EXPERIENCE_OPTIONS = ['Junior', 'Mid', 'Senior'];
const JOB_TYPE_OPTIONS = ['All', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const MATCH_SOURCE_OPTIONS = [
  { value: 'profile', label: 'Profile Only' },
  { value: 'cv', label: 'CV Only' },
  { value: 'both', label: 'Profile + CV' },
];

const COMPANY_TIER_OPTIONS = [
  { value: 'dream', label: 'Dream Company' },
  { value: 'high_priority', label: 'High Priority' },
  { value: 'preferred', label: 'Preferred' },
  { value: 'monitor', label: 'Monitor' },
];

// Older saved profiles stored target_companies as plain strings, before tiers
// existed - normalize them to the current {name, tier} shape so the UI never
// breaks on old data.
function normalizeTargetCompanies(list) {
  return (list || []).map((entry) =>
    typeof entry === 'string' ? { name: entry, tier: 'preferred' } : entry
  );
}

function persistCustomProfileFields(selectedIndustry, selectedSkills, selectedRoles) {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('customSkills_'))
    .forEach((k) => localStorage.removeItem(k));

  const industryPresetSkills = selectedIndustry
    ? (INDUSTRY_SKILLS[selectedIndustry] || []).flatMap((c) => c.items)
    : [];
  const industryPresetRoles = selectedIndustry
    ? (INDUSTRY_ROLES[selectedIndustry] || [])
    : [];

  const customSkills = selectedSkills.filter((skill) => !industryPresetSkills.includes(skill));
  const customRoles = selectedRoles.filter((role) => !industryPresetRoles.includes(role));

  if (selectedIndustry && customSkills.length > 0) {
    localStorage.setItem(`customSkills_${selectedIndustry}`, JSON.stringify(customSkills));
  }

  if (customRoles.length > 0) {
    localStorage.setItem('customRoles', JSON.stringify(customRoles));
  } else {
    localStorage.removeItem('customRoles');
  }
}

function loadCustomIndustries() {
  const saved = JSON.parse(localStorage.getItem('customIndustries') || '[]');
  return Array.isArray(saved) ? saved : [];
}

function persistCustomIndustries(industries) {
  const next = Array.from(new Set((industries || []).filter(Boolean)));
  localStorage.setItem('customIndustries', JSON.stringify(next));
  return next;
}

export default function Profile({ onProfileChange }) {
  const [step, setStep] = useState(() => {
    const stored = Number(localStorage.getItem('profileWizardStep'));
    return stored >= 1 && stored <= 5 ? stored : 1;
  });
  const [industry, setIndustry] = useState('');
  const [skills, setSkills] = useState([]);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [customIndustryInput, setCustomIndustryInput] = useState('');
  const [customIndustries, setCustomIndustries] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [roles, setRoles] = useState([]);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [education, setEducation] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [workAuthorization, setWorkAuthorization] = useState('');
  const [targetCompanies, setTargetCompanies] = useState([]);
  const [companyPage, setCompanyPage] = useState(0);
  const [customCompanyInput, setCustomCompanyInput] = useState('');
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [careerPaths, setCareerPaths] = useState([]);
  const [location, setLocation] = useState('Remote');
  const [jobType, setJobType] = useState('Full-time');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [removingCv, setRemovingCv] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState('');
  const [profileExists, setProfileExists] = useState(false);
  const [matchSource, setMatchSource] = useState('profile');
  const [cvData, setCvData] = useState({ has_cv: false, filename: '', keyword_count: 0, preview: '' });
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');

  const companySuggestions = useCompanySearch(customCompanyInput, { enabled: showCompanySuggestions });

  const skillCategories = industry ? (INDUSTRY_SKILLS[industry] || []) : [];
  const allPresetSkills = skillCategories.flatMap((c) => c.items);
  const roleOptions = industry ? (INDUSTRY_ROLES[industry] || []) : [];

  useEffect(() => {
    getMe()
      .then((data) => {
        const p = data.profile || {};
        const savedIndustry = p.industry || '';
        const backendSkills = p.skills || p.tech_stack || [];
        const backendRoles = p.roles || [];
        const currentCvData = data.cv_data || { has_cv: false };

        const industryValues = INDUSTRIES.map((item) => item.value);
        const storedCustomIndustries = loadCustomIndustries();
        const allCustomIndustries = [...storedCustomIndustries];
        if (savedIndustry && !industryValues.includes(savedIndustry) && !allCustomIndustries.includes(savedIndustry)) {
          allCustomIndustries.push(savedIndustry);
          persistCustomIndustries(allCustomIndustries);
        }
        setCustomIndustries(allCustomIndustries);

        if (savedIndustry || backendSkills.length || backendRoles.length || p.experience_level) {
          setProfileExists(true);
        }
        setIndustry(savedIndustry);
        if (savedIndustry) {
          const cats = INDUSTRY_SKILLS[savedIndustry] || [];
          setExpandedCategories(new Set(cats.length ? [cats[0].label] : []));
        }
        setSkills(backendSkills);
        setRoles(backendRoles);
        setExperienceLevel(p.experience_level || '');
        setYearsExperience(p.years_experience != null ? String(p.years_experience) : '');
        setEducation(p.education || []);
        setCertifications(p.certifications || []);
        setProjects(p.projects || []);
        setSalaryExpectation(p.salary_expectation || '');
        setWorkAuthorization(p.work_authorization || '');
        setTargetCompanies(normalizeTargetCompanies(p.target_companies));
        setCareerPaths(data.career_paths || []);
        setLocation(p.location === '' ? 'Any' : p.location || 'Remote');
        setJobType(p.job_type === '' ? 'All' : p.job_type || 'Full-time');
        setMatchSource(data.match_source || 'profile');
        setCvData(currentCvData);
        persistCustomProfileFields(savedIndustry, backendSkills, backendRoles);
      })
      .catch(console.error)
      .finally(() => setInitialLoadDone(true));
  }, []);

  const hasProfileData = !!(industry || skills.length || roles.length || experienceLevel);
  const canUseBoth = hasProfileData && cvData.has_cv;

  const handleCvUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCv(true);
    setError('');
    try {
      const result = await uploadCv(file);
      setCvData(result.cv_data || { has_cv: true, filename: file.name });
      setMatchSource(result.match_source || (hasProfileData ? 'both' : 'cv'));
      setProfileExists(true);
      setSaved(true);
      onProfileChange?.();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      event.target.value = '';
      setUploadingCv(false);
    }
  };

  const handleCvRemove = async () => {
    setRemovingCv(true);
    setError('');
    try {
      const result = await deleteCv();
      setCvData({ has_cv: false, filename: '', keyword_count: 0, preview: '' });
      setMatchSource(result.match_source || 'profile');
      setProfileExists(hasProfileData);
      setSaved(true);
      onProfileChange?.();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingCv(false);
    }
  };

  // When industry changes, save current industry's custom skills, then load the new industry's
  const handleIndustryChange = (value) => {
    if (industry === value) {
      setIndustry('');
      setExpandedCategories(new Set());
      setSkills((prev) => prev.filter((skill) => !allPresetSkills.includes(skill)));
      setRoles((prev) => prev.filter((role) => !roleOptions.includes(role)));
      return;
    }

    // Persist current industry's custom skills before switching
    if (industry) {
      const currentCustom = skills.filter((s) => !allPresetSkills.includes(s));
      localStorage.setItem(`customSkills_${industry}`, JSON.stringify(currentCustom));
    }

    // Load custom skills specific to the new industry
    const newCustom = JSON.parse(localStorage.getItem(`customSkills_${value}`) || '[]');

    setIndustry(value);
    const categories = INDUSTRY_SKILLS[value] || [];
    setExpandedCategories(new Set(categories.length ? [categories[0].label] : []));
    setSkills(newCustom);
    setRoles([]);
  };

  const toggleCategory = (label) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const toggleChip = (value, list, setList) => {
    setList((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const addCustomSkill = () => {
    const value = customSkillInput.trim();
    if (!value || skills.includes(value)) return;
    const newSkills = [...skills, value];
    setSkills(newSkills);
    const customs = newSkills.filter((s) => !allPresetSkills.includes(s));
    if (industry) localStorage.setItem(`customSkills_${industry}`, JSON.stringify(customs));
    setCustomSkillInput('');
  };

  const removeCustomSkill = (skill) => {
    const newSkills = skills.filter((v) => v !== skill);
    setSkills(newSkills);
    const customs = newSkills.filter((s) => !allPresetSkills.includes(s));
    if (industry) localStorage.setItem(`customSkills_${industry}`, JSON.stringify(customs));
  };

  const addCustomRole = () => {
    const value = customRoleInput.trim();
    if (!value || roles.includes(value)) return;
    const newRoles = [...roles, value];
    setRoles(newRoles);
    const customs = newRoles.filter((r) => !roleOptions.includes(r));
    localStorage.setItem('customRoles', JSON.stringify(customs));
    setCustomRoleInput('');
  };

  const removeCustomRole = (role) => {
    const newRoles = roles.filter((v) => v !== role);
    setRoles(newRoles);
    const customs = newRoles.filter((r) => !roleOptions.includes(r));
    localStorage.setItem('customRoles', JSON.stringify(customs));
  };

  const addEducationEntry = () => {
    setEducation((prev) => [...prev, { degree: '', field: '', institution: '', source: 'profile' }]);
  };

  const updateEducationEntry = (index, key, value) => {
    setEducation((prev) => prev.map((entry, i) => (i === index ? { ...entry, [key]: value } : entry)));
  };

  const removeEducationEntry = (index) => {
    setEducation((prev) => prev.filter((_, i) => i !== index));
  };

  const addTargetCompany = (nameOverride) => {
    const value = (nameOverride ?? customCompanyInput).trim();
    if (!value || targetCompanies.some((c) => c.name === value)) return;
    setTargetCompanies((prev) => [...prev, { name: value, tier: 'preferred' }]);
    setCustomCompanyInput('');
    setShowCompanySuggestions(false);
  };

  const removeTargetCompany = (name) => {
    setTargetCompanies((prev) => prev.filter((c) => c.name !== name));
  };

  const updateTargetCompanyTier = (name, tier) => {
    setTargetCompanies((prev) => prev.map((c) => (c.name === name ? { ...c, tier } : c)));
  };

  const buildProfilePayload = () => ({
    industry: industry || null,
    skills,
    roles,
    experience_level: experienceLevel || null,
    years_experience: yearsExperience !== '' ? Number(yearsExperience) : null,
    education: education.filter((entry) => entry.degree || entry.field || entry.institution),
    certifications,
    projects,
    salary_expectation: salaryExpectation || null,
    work_authorization: workAuthorization || null,
    target_companies: targetCompanies,
    location: location === 'Any' ? '' : location,
    job_type: jobType === 'All' ? '' : jobType,
  });

  // Selections were only ever persisted when the user reached the final step
  // and clicked Save - refreshing (or just closing the tab) any earlier lost
  // everything. Auto-save a draft in the background shortly after each change
  // so progress survives a refresh at any point in the wizard, not just step 5.
  const skippedLoadTriggeredRun = useRef(false);
  useEffect(() => {
    if (!initialLoadDone) return undefined;

    // The values loaded from the server also change this effect's deps -
    // skip that one run so we don't immediately re-save what we just loaded.
    if (!skippedLoadTriggeredRun.current) {
      skippedLoadTriggeredRun.current = true;
      return undefined;
    }

    const timer = setTimeout(() => {
      setDraftStatus('saving');
      updateProfile(buildProfilePayload())
        .then(() => {
          persistCustomProfileFields(industry, skills, roles);
          setProfileExists(true);
          setDraftStatus('saved');
        })
        .catch(() => setDraftStatus('error'));
    }, 1200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialLoadDone, industry, skills, roles, experienceLevel, yearsExperience,
    education, certifications, projects, salaryExpectation, workAuthorization,
    targetCompanies, location, jobType,
  ]);

  // So a refresh mid-wizard resumes on the same step instead of bouncing back to step 1.
  useEffect(() => {
    localStorage.setItem('profileWizardStep', String(step));
  }, [step]);

  const persistMatchSource = async (nextMatchSource, { syncProfile = true } = {}) => {
    if (syncProfile && nextMatchSource !== 'cv' && hasProfileData) {
      await updateProfile(buildProfilePayload());
      persistCustomProfileFields(industry, skills, roles);
      setProfileExists(true);
    }

    const result = await updateMatchSource(nextMatchSource);
    setMatchSource(result.match_source || nextMatchSource);
    onProfileChange?.();
    return result;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateProfile(buildProfilePayload());
      let nextMatchSource = matchSource;
      if (nextMatchSource === 'cv' && !cvData.has_cv) nextMatchSource = 'profile';
      if (nextMatchSource === 'both' && !cvData.has_cv) nextMatchSource = 'profile';
      await persistMatchSource(nextMatchSource, { syncProfile: false });
      persistCustomProfileFields(industry, skills, roles);
      setSaved(true);
      setProfileExists(true);
      setDraftStatus('');
      onProfileChange?.();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError('');
    try {
      await resetProfile();
      // Clear all per-industry custom skill keys from localStorage
      Object.keys(localStorage)
        .filter((k) => k.startsWith('customSkills_'))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem('customRoles');
      // Reset all local state
      setIndustry('');
      setSkills([]);
      setRoles([]);
      setExperienceLevel('');
      setYearsExperience('');
      setEducation([]);
      setCertifications([]);
      setProjects([]);
      setSalaryExpectation('');
      setWorkAuthorization('');
      setTargetCompanies([]);
      setLocation('Remote');
      setJobType('Full-time');
      setExpandedCategories(new Set());
      setStep(1);
      setProfileExists(false);
      setConfirmReset(false);
      setDraftStatus('');
      if (cvData.has_cv) {
        await persistMatchSource('cv');
      } else {
        setMatchSource('profile');
      }
      onProfileChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  };

  const customSkills = skills.filter((s) => !allPresetSkills.includes(s));
  const customRoles = roles.filter((r) => !roleOptions.includes(r));
  const industryOptions = [
    ...INDUSTRIES,
    ...customIndustries
      .filter((value) => !INDUSTRIES.some((item) => item.value === value))
      .map((value) => ({ value, label: value })),
  ];
  const stepTitles = ['Industry', 'Skills', 'Role & Level', 'Background', 'Location'];
  const missingMatchModeRequirements = [];

  if (!hasProfileData) {
    missingMatchModeRequirements.push('save your profile preferences');
  }
  if (!cvData.has_cv) {
    missingMatchModeRequirements.push('upload a CV');
  }

  // Determine if each step is completed
  const stepCompleted = {
    1: !!industry,
    2: skills.length > 0,
    3: roles.length > 0 && !!experienceLevel,
    4: true, // background details are all optional
    5: !!location && !!jobType,
  };

  return (
    <div className="profile-page">
      <div className="dashboard-card profile-intro-card" style={{ marginBottom: 24 }}>
        <div className="profile-intro-header">
          <div className="profile-intro-copy">
            <h3 className="profile-panel-title">Matching Inputs</h3>
            <p className="profile-panel-text">
              Choose whether job matching should use your structured profile, your uploaded CV, or both together.
            </p>
          </div>
          <div className="profile-intro-meta">
            <span className="profile-intro-meta-label">Current mode</span>
            <strong className="profile-intro-meta-value">
              {MATCH_SOURCE_OPTIONS.find((option) => option.value === matchSource)?.label || 'Profile Only'}
            </strong>
          </div>
        </div>

        <div className="chip-grid match-mode-grid">
          {MATCH_SOURCE_OPTIONS.map((option) => {
            const disabled =
              (option.value === 'profile' && !hasProfileData) ||
              (option.value === 'cv' && !cvData.has_cv) ||
              (option.value === 'both' && !canUseBoth);

            return (
              <button
                key={option.value}
                type="button"
                className={`chip ${matchSource === option.value ? 'selected' : ''} ${disabled ? 'chip-disabled' : ''}`}
                disabled={disabled || saving || uploadingCv || removingCv}
                onClick={() => persistMatchSource(option.value).catch((err) => setError(err.message))}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {missingMatchModeRequirements.length > 0 && (
          <p className="match-mode-helper">
            To unlock all matching modes, {missingMatchModeRequirements.join(' and ')}.
          </p>
        )}

        <div className="profile-section cv-panel">
          <label className="profile-label">Upload CV</label>
          <p className="profile-panel-text" style={{ marginBottom: 12 }}>
            Upload a PDF, DOCX, TXT, or MD CV and we&apos;ll extract keywords to help match jobs.
          </p>
          <input
            type="file"
            className="cv-file-input"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleCvUpload}
            disabled={uploadingCv || removingCv}
          />
          {uploadingCv && <p className="profile-upload-state" style={{ marginTop: 8 }}>Uploading and analyzing CV...</p>}
          {cvData.has_cv && (
            <div className="cv-summary" style={{ marginTop: 12 }}>
              <p className="cv-summary-name"><strong>{cvData.filename}</strong> uploaded</p>
              <p className="cv-summary-meta">{cvData.keyword_count || 0} CV keywords extracted</p>
              {cvData.preview && (
                <p className="alert alert-info cv-summary-preview" style={{ marginTop: 8 }}>
                  {cvData.preview}
                </p>
              )}
              <button
                type="button"
                className="button button-danger"
                onClick={handleCvRemove}
                disabled={removingCv}
              >
                {removingCv ? 'Removing CV...' : 'Remove CV'}
              </button>
            </div>
          )}
        </div>
      </div>

      {careerPaths.length > 0 && (
        <div className="dashboard-card career-paths-card" style={{ marginBottom: 24 }}>
          <h3 className="profile-panel-title">Career Path Matches</h3>
          <p className="profile-panel-text">
            Based on your skills, you may be a strong match for:
          </p>
          <div className="career-paths-list">
            {careerPaths.map(({ role, confidence }) => (
              <div key={role} className="career-path-row">
                <span className="career-path-role">{role}</span>
                <div className="career-path-bar-track">
                  <div className="career-path-bar-fill" style={{ width: `${confidence}%` }} />
                </div>
                <span className="career-path-confidence">{confidence}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="wizard-header profile-wizard-header">
        <div className="wizard-header-top">
          <div className="profile-step">
            <h2>{profileExists ? 'Update Your Profile' : 'Set Up Your Profile'}</h2>
            <p>Help us match you with the right jobs</p>
            {draftStatus === 'saving' && <span className="section-header-updated">Saving draft...</span>}
            {draftStatus === 'saved' && <span className="section-header-updated">Draft saved</span>}
            {draftStatus === 'error' && <span className="section-header-updated" style={{ color: 'var(--error)', whiteSpace: 'normal' }}>Couldn&apos;t save draft - check your connection</span>}
          </div>
          {profileExists && !confirmReset && (
            <button
              type="button"
              className="button button-danger"
              onClick={() => setConfirmReset(true)}
            >
              Reset Profile
            </button>
          )}
          {confirmReset && (
            <div className="reset-confirm">
              <span>This will clear all your preferences. Sure?</span>
              <button
                type="button"
                className="button button-danger"
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting ? 'Resetting...' : 'Yes, Reset'}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="wizard-steps">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="wizard-step-col">
              <button
                className={`wizard-step ${step === n ? 'active' : ''} ${stepCompleted[n] ? 'done' : ''}`}
                onClick={() => setStep(n)}
              >
                {stepCompleted[n] ? <CheckCircle size={16} /> : n}
              </button>
              <span className={`wizard-step-label ${step === n ? 'active' : ''}`}>{stepTitles[n - 1]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="wizard-body profile-wizard-body">
        {/* Step 1 — Industry selection */}
        {step === 1 && (
          <div className="profile-step">
            <h3>What industry do you work in?</h3>
            <p>Pick the one that best describes your field, or add your own below</p>
            <div className="industry-grid">
              {industryOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`industry-card ${industry === value ? 'selected' : ''}`}
                  onClick={() => handleIndustryChange(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="custom-tech-row" style={{ marginTop: 16 }}>
              <input
                type="text"
                className="profile-input"
                placeholder="Can't find your industry? Type it here and press Enter"
                value={customIndustryInput}
                onChange={(e) => setCustomIndustryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = customIndustryInput.trim();
                    if (!value) return;
                    const nextCustomIndustries = persistCustomIndustries([
                      ...customIndustries,
                      value,
                    ]);
                    setCustomIndustries(nextCustomIndustries);
                    setCustomIndustryInput('');
                    handleIndustryChange(value);
                  }
                }}
              />
              <button
                type="button"
                className="button"
                onClick={() => {
                  const value = customIndustryInput.trim();
                  if (!value) return;
                  const nextCustomIndustries = persistCustomIndustries([
                    ...customIndustries,
                    value,
                  ]);
                  setCustomIndustries(nextCustomIndustries);
                  setCustomIndustryInput('');
                  handleIndustryChange(value);
                }}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Skills */}
        {step === 2 && (
          <div className="profile-step">
            <h3>What are your key skills?</h3>
            <p>Select all that apply, or add your own below</p>

            {!industry && (
              <p className="alert alert-info" style={{ marginBottom: 16 }}>
                Go back and select an industry to see relevant skill suggestions.
              </p>
            )}

            {skillCategories.length > 0 && (
              <div className="tech-categories">
                {skillCategories.map(({ label, items }) => {
                  const selectedCount = items.filter((s) => skills.includes(s)).length;
                  const isExpanded = expandedCategories.has(label);
                  return (
                    <div key={label} className="tech-category">
                      <button
                        type="button"
                        className="tech-category-header"
                        onClick={() => toggleCategory(label)}
                      >
                        <span className="tech-category-label">{label}</span>
                        <span className="tech-category-meta">
                          {selectedCount > 0 && (
                            <span className="tech-category-badge">{selectedCount} selected</span>
                          )}
                          <ChevronDown
                            size={16}
                            className={`tech-category-chevron ${isExpanded ? 'expanded' : ''}`}
                          />
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="chip-grid tech-category-chips">
                          {items.map((skill) => (
                            <button
                              key={skill}
                              type="button"
                              className={`chip ${skills.includes(skill) ? 'selected' : ''}`}
                              onClick={() => toggleChip(skill, skills, setSkills)}
                            >
                              {skill}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {customSkills.length > 0 && (
                  <div className="tech-category">
                    <div className="tech-category-header" style={{ cursor: 'default' }}>
                      <span className="tech-category-label">My Custom Skills</span>
                      <span className="tech-category-badge">{customSkills.length} added</span>
                    </div>
                    <div className="chip-grid tech-category-chips">
                      {customSkills.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          className="chip selected chip-custom"
                          onClick={() => removeCustomSkill(skill)}
                        >
                          {skill} &times;
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="custom-tech-row">
              <input
                type="text"
                className="profile-input"
                placeholder="Can't find yours? Type it here and press Enter"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); }
                }}
              />
              <button type="button" className="button" onClick={addCustomSkill}>
                Add
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Role & Experience */}
        {step === 3 && (
          <div className="profile-step">
            <h3>What is your role and experience level?</h3>
            <div className="profile-section">
              <label className="profile-label">Role (select all that apply)</label>
              <div className="chip-grid">
                {roleOptions.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className={`chip ${roles.includes(role) ? 'selected' : ''}`}
                    onClick={() => toggleChip(role, roles, setRoles)}
                  >
                    {role}
                  </button>
                ))}
                {customRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className="chip selected chip-custom"
                    onClick={() => removeCustomRole(role)}
                  >
                    {role} &times;
                  </button>
                ))}
              </div>
              <div className="custom-tech-row">
                <input
                  type="text"
                  className="profile-input"
                  placeholder="Can't find your role? Type it here and press Enter"
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addCustomRole(); }
                  }}
                />
                <button type="button" className="button" onClick={addCustomRole}>
                  Add
                </button>
              </div>
            </div>
            <div className="profile-section">
              <label className="profile-label">Experience Level</label>
              <div className="chip-grid">
                {EXPERIENCE_OPTIONS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`chip ${experienceLevel === level ? 'selected' : ''}`}
                    onClick={() => setExperienceLevel(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Background details (all optional) */}
        {step === 4 && (
          <div className="profile-step">
            <h3>Tell us more about your background</h3>
            <p>All optional — the more you share, the better we can explain why a job matches you</p>

            <div className="profile-section">
              <label className="profile-label">Years of Experience</label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="profile-input"
                placeholder="e.g. 3"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
              />
            </div>

            <div className="profile-section">
              <label className="profile-label">Education</label>
              {education.map((entry, index) => (
                <div key={index} className="custom-tech-row" style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    className="profile-input"
                    placeholder="Degree (e.g. BSc)"
                    value={entry.degree || ''}
                    onChange={(e) => updateEducationEntry(index, 'degree', e.target.value)}
                  />
                  <input
                    type="text"
                    className="profile-input"
                    placeholder="Field (e.g. Computer Science)"
                    value={entry.field || ''}
                    onChange={(e) => updateEducationEntry(index, 'field', e.target.value)}
                  />
                  <input
                    type="text"
                    className="profile-input"
                    placeholder="Institution"
                    value={entry.institution || ''}
                    onChange={(e) => updateEducationEntry(index, 'institution', e.target.value)}
                  />
                  <button type="button" className="button button-danger" onClick={() => removeEducationEntry(index)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="button" onClick={addEducationEntry}>
                + Add Education
              </button>
            </div>

            <ChipInput
              label="Certifications"
              values={certifications}
              placeholder="e.g. PMP, AWS Certified Solutions Architect - press Enter"
              onAdd={(v) => setCertifications((prev) => [...prev, v])}
              onRemove={(v) => setCertifications((prev) => prev.filter((c) => c !== v))}
            />

            <ChipInput
              label="Projects"
              values={projects}
              placeholder="Briefly name a project - press Enter"
              onAdd={(v) => setProjects((prev) => [...prev, v])}
              onRemove={(v) => setProjects((prev) => prev.filter((p) => p !== v))}
            />

            <div className="profile-section">
              <label className="profile-label">Salary Expectation</label>
              <input
                type="text"
                className="profile-input"
                placeholder="e.g. 50,000 - 70,000 GHS per year"
                value={salaryExpectation}
                onChange={(e) => setSalaryExpectation(e.target.value)}
              />
            </div>

            <div className="profile-section">
              <label className="profile-label">Work Authorization</label>
              <input
                type="text"
                className="profile-input"
                placeholder="e.g. Ghanaian citizen, no sponsorship needed / I need visa sponsorship"
                value={workAuthorization}
                onChange={(e) => setWorkAuthorization(e.target.value)}
              />
              <p className="profile-panel-text" style={{ marginTop: 4 }}>
                Only used to avoid jobs that explicitly require sponsorship you don&apos;t have - we never guess.
              </p>
            </div>

            <div className="profile-section">
              <label className="profile-label">Target Companies</label>
              <p className="profile-panel-text" style={{ marginBottom: 8 }}>
                Jobs at these companies get a ranking boost in your feed - bigger for higher-priority tiers.
              </p>
              {(() => {
                const totalPages = Math.max(1, Math.ceil(targetCompanies.length / COMPANIES_PER_PAGE));
                const currentPage = Math.min(companyPage, totalPages - 1);
                const pageStart = currentPage * COMPANIES_PER_PAGE;
                const pagedCompanies = targetCompanies.slice(pageStart, pageStart + COMPANIES_PER_PAGE);
                return (
                  <>
                    {pagedCompanies.map((company) => (
                      <div key={company.name} className="custom-tech-row" style={{ marginBottom: 8 }}>
                        <span className="chip selected chip-custom" style={{ flex: '0 0 auto' }}>
                          {company.name}
                        </span>
                        <select
                          className="profile-input profile-select"
                          value={company.tier || 'preferred'}
                          onChange={(e) => updateTargetCompanyTier(company.name, e.target.value)}
                        >
                          {COMPANY_TIER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <button type="button" className="button button-danger" onClick={() => removeTargetCompany(company.name)}>
                          Remove
                        </button>
                      </div>
                    ))}
                    {targetCompanies.length > COMPANIES_PER_PAGE && (
                      <div className="pagination pagination-compact">
                        <button
                          type="button"
                          className="pagination-btn"
                          onClick={() => setCompanyPage((p) => Math.max(0, p - 1))}
                          disabled={currentPage === 0}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="pagination-pages-label">
                          Page {currentPage + 1} of {totalPages} ({targetCompanies.length} companies)
                        </span>
                        <button
                          type="button"
                          className="pagination-btn"
                          onClick={() => setCompanyPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={currentPage === totalPages - 1}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="custom-tech-row">
                <div className="autocomplete-input-wrapper">
                  <input
                    type="text"
                    className="profile-input"
                    placeholder="e.g. AmaliTech, Google - press Enter"
                    value={customCompanyInput}
                    onChange={(e) => setCustomCompanyInput(e.target.value)}
                    onFocus={() => setShowCompanySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 150)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addTargetCompany(); }
                    }}
                  />
                  {showCompanySuggestions && companySuggestions.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {companySuggestions
                        .filter((name) => !targetCompanies.some((c) => c.name === name))
                        .map((name) => (
                          <button
                            key={name}
                            type="button"
                            className="autocomplete-option"
                            onMouseDown={(e) => { e.preventDefault(); addTargetCompany(name); }}
                          >
                            {name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <button type="button" className="button" onClick={() => addTargetCompany()}>
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5 — Location & Job Type */}
        {step === 5 && (
          <div>
            <h3>Where do you want to work?</h3>
            <div className="profile-section">
              <label className="profile-label">Location</label>
              <select
                className="profile-input profile-select"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="Any">Any (Remote, On-Premises, or Hybrid)</option>
                <option value="Remote">Remote</option>
                <option value="On-Premises">On-Premises</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div className="profile-section">
              <label className="profile-label">Job Type</label>
              <div className="chip-grid">
                {JOB_TYPE_OPTIONS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`chip ${jobType === type ? 'selected' : ''}`}
                    onClick={() => setJobType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="wizard-footer">
        <button
          className="button button-secondary"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          <ChevronLeft size={18} /> Back
        </button>

        {step < 5 ? (
          <button className="button" onClick={() => setStep((s) => s + 1)}>
            Next <ChevronRight size={18} />
          </button>
        ) : (
          <button className="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        )}
      </div>

      {error && <p className="alert alert-error" style={{ marginTop: 16 }}>{error}</p>}
      {saved && (
        <p className="alert alert-success" style={{ marginTop: 16 }}>
          Profile saved successfully!
        </p>
      )}
    </div>
  );
}
