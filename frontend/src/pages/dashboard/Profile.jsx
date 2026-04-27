import { useState, useEffect } from 'react';
import { getMe, updateProfile, resetProfile } from '../../services/api';
import { CheckCircle, ChevronRight, ChevronLeft, ChevronDown } from 'lucide-react';

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
const JOB_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];

export default function Profile() {
  const [step, setStep] = useState(1);
  const [industry, setIndustry] = useState('');
  const [skills, setSkills] = useState([]);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [roles, setRoles] = useState([]);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [location, setLocation] = useState('Remote');
  const [jobType, setJobType] = useState('Full-time');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState('');
  const [profileExists, setProfileExists] = useState(false);

  const skillCategories = industry ? (INDUSTRY_SKILLS[industry] || []) : [];
  const allPresetSkills = skillCategories.flatMap((c) => c.items);
  const roleOptions = industry ? (INDUSTRY_ROLES[industry] || []) : [];

  useEffect(() => {
    const savedCustomRoles = JSON.parse(localStorage.getItem('customRoles') || '[]');

    getMe()
      .then((data) => {
        const p = data.profile || {};
        const savedIndustry = p.industry || '';
        const backendSkills = p.skills || p.tech_stack || [];
        const backendRoles = p.roles || [];

        // Load custom skills scoped to this industry
        const savedCustomSkills = JSON.parse(
          localStorage.getItem(`customSkills_${savedIndustry}`) || '[]'
        );

        const mergedSkills = [...new Set([...backendSkills, ...savedCustomSkills])];
        const mergedRoles = [...new Set([...backendRoles, ...savedCustomRoles])];

        if (savedIndustry || mergedSkills.length || mergedRoles.length || p.experience_level) {
          setProfileExists(true);
        }
        setIndustry(savedIndustry);
        if (savedIndustry) {
          const cats = INDUSTRY_SKILLS[savedIndustry] || [];
          setExpandedCategories(new Set(cats.length ? [cats[0].label] : []));
        }
        setSkills(mergedSkills);
        setRoles(mergedRoles);
        setExperienceLevel(p.experience_level || '');
        setLocation(p.location || 'Remote');
        setJobType(p.job_type || 'Full-time');
      })
      .catch(console.error);
  }, []);

  // When industry changes, save current industry's custom skills, then load the new industry's
  const handleIndustryChange = (value) => {
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
    setSkills(newCustom);  // Start with only this industry's saved custom skills
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

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateProfile({
        industry: industry || null,
        skills,
        roles,
        experience_level: experienceLevel || null,
        location,
        job_type: jobType,
      });
      setSaved(true);
      setProfileExists(true);
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
      setLocation('Remote');
      setJobType('Full-time');
      setExpandedCategories(new Set());
      setStep(1);
      setProfileExists(false);
      setConfirmReset(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  };

  const customSkills = skills.filter((s) => !allPresetSkills.includes(s));
  const customRoles = roles.filter((r) => !roleOptions.includes(r));

  return (
    <div className="profile-page">
      <div className="wizard-header">
        <div className="wizard-header-top">
          <div>
            <h2>{profileExists ? 'Update Your Profile' : 'Set Up Your Profile'}</h2>
            <p>Help us match you with the right jobs</p>
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
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              className={`wizard-step ${step === n ? 'active' : ''} ${step > n ? 'done' : ''}`}
              onClick={() => setStep(n)}
            >
              {step > n ? <CheckCircle size={16} /> : n}
            </button>
          ))}
        </div>
        <div className="wizard-step-labels">
          <span>Industry</span>
          <span>Skills</span>
          <span>Role &amp; Level</span>
          <span>Location</span>
        </div>
      </div>

      <div className="wizard-body">
        {/* Step 1 — Industry selection */}
        {step === 1 && (
          <div>
            <h3>What industry do you work in?</h3>
            <p>Pick the one that best describes your field</p>
            <div className="industry-grid">
              {INDUSTRIES.map(({ value, label }) => (
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
          </div>
        )}

        {/* Step 2 — Skills */}
        {step === 2 && (
          <div>
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
          <div>
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

        {/* Step 4 — Location & Job Type */}
        {step === 4 && (
          <div>
            <h3>Where do you want to work?</h3>
            <div className="profile-section">
              <label className="profile-label">Location</label>
              <select
                className="profile-input profile-select"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
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

        {step < 4 ? (
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
