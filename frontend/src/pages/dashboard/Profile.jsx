import { useState, useEffect } from 'react';
import { getMe, updateProfile } from '../../services/api';
import { CheckCircle, ChevronRight, ChevronLeft, ChevronDown } from 'lucide-react';

const TECH_CATEGORIES = [
  {
    label: 'Languages',
    items: ['Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust', 'C#', 'C++', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Scala', 'Dart', 'R'],
  },
  {
    label: 'Frontend',
    items: ['React', 'Vue', 'Angular', 'Next.js', 'Tailwind CSS'],
  },
  {
    label: 'Backend',
    items: ['Django', 'FastAPI', 'Flask', 'Node.js', 'Express.js', 'NestJS', 'Spring Boot', 'Spring', 'Laravel', 'Ruby on Rails', 'ASP.NET'],
  },
  {
    label: 'Testing',
    items: ['Selenium', 'Selenide', 'Playwright', 'Cypress', 'PyTest', 'JUnit'],
  },
  {
    label: 'Mobile',
    items: ['Flutter', 'React Native'],
  },
  {
    label: 'DevOps & Cloud',
    items: ['Docker', 'Kubernetes', 'AWS', 'Azure', 'Terraform', 'Jenkins', 'CI/CD', 'Nginx', 'Linux'],
  },
  {
    label: 'Databases',
    items: ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'SQLite', 'Kafka'],
  },
  {
    label: 'Cybersecurity',
    items: ['Kali Linux', 'Metasploit', 'Wireshark', 'Burp Suite', 'Nmap', 'Nessus', 'Snort', 'Splunk', 'Penetration Testing', 'Network Security', 'Cryptography', 'Malware Analysis', 'Reverse Engineering', 'OSINT'],
  },
  {
    label: 'APIs & Tools',
    items: ['GraphQL', 'REST API', 'Git'],
  },
];

// Flat list derived from categories — used to detect custom entries
const TECH_OPTIONS = TECH_CATEGORIES.flatMap((c) => c.items);

const ROLE_OPTIONS = [
  // Software Engineering
  'Backend Developer', 'Frontend Developer', 'Full Stack Developer',
  'Mobile Developer', 'QA Engineer',
  // Infrastructure & Cloud
  'DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer',
  // Data & AI
  'Data Engineer', 'ML Engineer', 'Data Scientist', 'AI Engineer',
  // Cybersecurity
  'Security Engineer', 'Penetration Tester', 'Security Analyst',
  'Malware Analyst', 'Cloud Security Engineer',
  'Application Security Engineer', 'Cybersecurity Consultant',
];

const EXPERIENCE_OPTIONS = ['Junior', 'Mid', 'Senior'];
const JOB_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];

export default function Profile() {
  const [step, setStep] = useState(1);
  const [techStack, setTechStack] = useState([]);
  const [customTechInput, setCustomTechInput] = useState('');
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set(['Languages']));
  const [roles, setRoles] = useState([]);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [location, setLocation] = useState('Remote');
  const [jobType, setJobType] = useState('Full-time');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [profileExists, setProfileExists] = useState(false);

  useEffect(() => {
    const savedCustomTechs = JSON.parse(localStorage.getItem('customTechs') || '[]');
    const savedCustomRoles = JSON.parse(localStorage.getItem('customRoles') || '[]');

    getMe()
      .then((data) => {
        const p = data.profile || {};
        const backendTechs = p.tech_stack || [];
        const backendRoles = p.roles || [];

        const mergedTechs = [...new Set([...backendTechs, ...savedCustomTechs])];
        const mergedRoles = [...new Set([...backendRoles, ...savedCustomRoles])];

        if (mergedTechs.length || mergedRoles.length || p.experience_level) {
          setProfileExists(true);
        }
        setTechStack(mergedTechs);
        setRoles(mergedRoles);
        setExperienceLevel(p.experience_level || '');
        setLocation(p.location || 'Remote');
        setJobType(p.job_type || 'Full-time');
      })
      .catch(console.error);
  }, []);

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

  const addCustomTech = () => {
    const value = customTechInput.trim();
    if (!value) return;
    if (!techStack.includes(value)) {
      const newStack = [...techStack, value];
      setTechStack(newStack);
      const customs = newStack.filter((t) => !TECH_OPTIONS.includes(t));
      localStorage.setItem('customTechs', JSON.stringify(customs));
    }
    setCustomTechInput('');
  };

  const removeCustomTech = (tech) => {
    const newStack = techStack.filter((v) => v !== tech);
    setTechStack(newStack);
    const customs = newStack.filter((t) => !TECH_OPTIONS.includes(t));
    localStorage.setItem('customTechs', JSON.stringify(customs));
  };

  const addCustomRole = () => {
    const value = customRoleInput.trim();
    if (!value) return;
    if (!roles.includes(value)) {
      const newRoles = [...roles, value];
      setRoles(newRoles);
      const customs = newRoles.filter((r) => !ROLE_OPTIONS.includes(r));
      localStorage.setItem('customRoles', JSON.stringify(customs));
    }
    setCustomRoleInput('');
  };

  const removeCustomRole = (role) => {
    const newRoles = roles.filter((v) => v !== role);
    setRoles(newRoles);
    const customs = newRoles.filter((r) => !ROLE_OPTIONS.includes(r));
    localStorage.setItem('customRoles', JSON.stringify(customs));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateProfile({
        tech_stack: techStack,
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

  return (
    <div className="profile-page">
      <div className="wizard-header">
        <h2>{profileExists ? 'Update Your Profile' : 'Set Up Your Profile'}</h2>
        <p>Help us match you with the right jobs</p>

        <div className="wizard-steps">
          {[1, 2, 3].map((n) => (
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
          <span>Tech Stack</span>
          <span>Role &amp; Level</span>
          <span>Location</span>
        </div>
      </div>

      <div className="wizard-body">
        {step === 1 && (
          <div>
            <h3>What technologies do you work with?</h3>
            <p>Select all that apply, or add your own below</p>

            <div className="tech-categories">
              {TECH_CATEGORIES.map(({ label, items }) => {
                const selectedCount = items.filter((t) => techStack.includes(t)).length;
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
                        {items.map((tech) => (
                          <button
                            key={tech}
                            type="button"
                            className={`chip ${techStack.includes(tech) ? 'selected' : ''}`}
                            onClick={() => toggleChip(tech, techStack, setTechStack)}
                          >
                            {tech}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Custom entries */}
              {techStack.filter((t) => !TECH_OPTIONS.includes(t)).length > 0 && (
                <div className="tech-category">
                  <div className="tech-category-header" style={{ cursor: 'default' }}>
                    <span className="tech-category-label">My Custom Technologies</span>
                    <span className="tech-category-badge">
                      {techStack.filter((t) => !TECH_OPTIONS.includes(t)).length} added
                    </span>
                  </div>
                  <div className="chip-grid tech-category-chips">
                    {techStack
                      .filter((t) => !TECH_OPTIONS.includes(t))
                      .map((tech) => (
                        <button
                          key={tech}
                          type="button"
                          className="chip selected chip-custom"
                          onClick={() => removeCustomTech(tech)}
                        >
                          {tech} &times;
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="custom-tech-row">
              <input
                type="text"
                className="profile-input"
                placeholder="Can't find yours? Type it here (e.g. Quarkus, Micronaut...)"
                value={customTechInput}
                onChange={(e) => setCustomTechInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addCustomTech(); }
                }}
              />
              <button type="button" className="button" onClick={addCustomTech}>
                Add
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3>What is your role and experience level?</h3>
            <div className="profile-section">
              <label className="profile-label">Role (select all that apply)</label>
              <div className="chip-grid">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className={`chip ${roles.includes(role) ? 'selected' : ''}`}
                    onClick={() => toggleChip(role, roles, setRoles)}
                  >
                    {role}
                  </button>
                ))}
                {roles
                  .filter((r) => !ROLE_OPTIONS.includes(r))
                  .map((role) => (
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
                  placeholder="Can't find your role? Type it here (e.g. Security Researcher...)"
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

        {step === 3 && (
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

        {step < 3 ? (
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
