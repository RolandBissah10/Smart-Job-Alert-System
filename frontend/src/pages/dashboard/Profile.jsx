import { useState, useEffect } from 'react';
import { getMe, updateProfile } from '../../services/api';
import { CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';

const TECH_OPTIONS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust', 'C#',
  'PHP', 'Ruby', 'Swift', 'Kotlin', 'React', 'Vue', 'Angular',
  'Django', 'FastAPI', 'Node.js', 'Docker', 'Kubernetes', 'AWS',
  'GCP', 'Azure', 'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL',
];

const ROLE_OPTIONS = [
  'Backend Developer', 'Frontend Developer', 'Full Stack Developer',
  'DevOps Engineer', 'Data Engineer', 'ML Engineer',
  'Mobile Developer', 'QA Engineer', 'Cloud Engineer',
];

const EXPERIENCE_OPTIONS = ['Junior', 'Mid', 'Senior'];
const JOB_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];

export default function Profile() {
  const [step, setStep] = useState(1);
  const [techStack, setTechStack] = useState([]);
  const [roles, setRoles] = useState([]);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [location, setLocation] = useState('Remote');
  const [jobType, setJobType] = useState('Full-time');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [profileExists, setProfileExists] = useState(false);

  useEffect(() => {
    getMe()
      .then((data) => {
        const p = data.profile || {};
        if (p.tech_stack?.length || p.roles?.length) {
          setProfileExists(true);
          setTechStack(p.tech_stack || []);
          setRoles(p.roles || []);
          setExperienceLevel(p.experience_level || '');
          setLocation(p.location || 'Remote');
          setJobType(p.job_type || 'Full-time');
        }
      })
      .catch(console.error);
  }, []);

  const toggleChip = (value, list, setList) => {
    setList((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
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
            <p>Select all that apply</p>
            <div className="chip-grid">
              {TECH_OPTIONS.map((tech) => (
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
              <input
                className="profile-input"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Remote, USA, UK, Ghana..."
              />
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
