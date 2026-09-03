from app.services.scoring import (
    score_skills_dimension,
    score_seniority_dimension,
    score_education_dimension,
    score_location_dimension,
    score_role_dimension,
    compute_match,
    NEUTRAL_SCORE,
    QUALITY_SCORES,
    TIER_BONUSES,
)

# Deliberately fictional skill names so these tests never accidentally depend
# on (or break from changes to) the real skills-taxonomy data file's content.
FAKE_SKILL_A = "Zzz-Fake-Skill-Alpha"
FAKE_SKILL_B = "Zzz-Fake-Skill-Beta"


class TestScoreSkillsDimension:
    def test_all_job_skills_matched(self):
        job = {"skills": [FAKE_SKILL_A]}
        profile = {"skills": [FAKE_SKILL_A]}
        result = score_skills_dimension(job, profile)
        assert result["score"] == 100
        assert result["matched"] == [FAKE_SKILL_A]
        assert result["missing_key_skills"] == []

    def test_half_of_job_skills_matched(self):
        job = {"skills": [FAKE_SKILL_A, FAKE_SKILL_B]}
        profile = {"skills": [FAKE_SKILL_A]}
        result = score_skills_dimension(job, profile)
        assert result["score"] == 50
        assert result["matched"] == [FAKE_SKILL_A]
        assert result["missing_key_skills"] == [FAKE_SKILL_B]

    def test_no_skills_matched(self):
        job = {"skills": [FAKE_SKILL_A]}
        profile = {"skills": []}
        result = score_skills_dimension(job, profile)
        assert result["score"] == 0
        assert "None of this job's listed skills" in result["explanation"]

    def test_matching_is_case_insensitive(self):
        job = {"skills": ["python"]}
        profile = {"skills": ["Python"]}
        result = score_skills_dimension(job, profile)
        assert result["score"] == 100

    def test_falls_back_to_keyword_heuristic_when_job_has_no_skills_list(self):
        job = {"title": "Python Developer", "description": "Build APIs"}
        profile = {"skills": ["Python"]}
        result = score_skills_dimension(job, profile)
        assert result["score"] == 50  # 30 base + 20 per hit, 1 hit

    def test_neutral_score_when_nothing_to_compare(self):
        job = {"title": "Engineer", "description": "Join us"}
        profile = {}
        result = score_skills_dimension(job, profile)
        assert result["score"] == NEUTRAL_SCORE


class TestScoreSeniorityDimension:
    def test_exact_level_match_scores_excellent(self):
        job = {"title": "Senior Engineer", "description": ""}
        profile = {"years_experience": 6}
        result = score_seniority_dimension(job, profile)
        assert result["quality"] == "excellent"
        assert result["score"] == QUALITY_SCORES["excellent"]

    def test_no_data_scores_neutral(self):
        job = {"title": "Engineer", "description": ""}
        profile = {}
        result = score_seniority_dimension(job, profile)
        assert result["quality"] == "unknown"
        assert result["score"] == NEUTRAL_SCORE

    def test_cv_years_used_as_fallback(self):
        job = {"title": "Senior Engineer", "description": ""}
        profile = {"cv_years_experience": 6}
        result = score_seniority_dimension(job, profile)
        assert result["quality"] == "excellent"


class TestScoreEducationDimension:
    def test_no_education_is_neutral_not_penalized(self):
        result = score_education_dimension({}, {})
        assert result["score"] == NEUTRAL_SCORE

    def test_has_education_scores_higher(self):
        result = score_education_dimension({}, {"education": [{"degree": "BSc"}]})
        assert result["score"] == 85


class TestScoreLocationDimension:
    def test_matching_location_scores_100(self):
        result = score_location_dimension({"location": "Remote"}, {"location": "Remote"})
        assert result["score"] == 100

    def test_mismatched_location_scores_0(self):
        result = score_location_dimension({"location": "Remote only"}, {"location": "On-Premises"})
        assert result["score"] == 0


class TestScoreRoleDimension:
    def test_no_roles_set_is_neutral(self):
        result = score_role_dimension({"title": "Engineer", "description": ""}, {})
        assert result["score"] == NEUTRAL_SCORE

    def test_title_hit_scores_100(self):
        job = {"title": "Backend Engineer", "description": ""}
        profile = {"roles": ["Backend Engineer"]}
        result = score_role_dimension(job, profile)
        assert result["score"] == 100

    def test_description_only_hit_scores_70(self):
        job = {"title": "Software Developer", "description": "You'll work as a Backend Engineer"}
        profile = {"roles": ["Backend Engineer"]}
        result = score_role_dimension(job, profile)
        assert result["score"] == 70

    def test_no_hit_scores_30(self):
        job = {"title": "Marketing Manager", "description": "Own our campaigns"}
        profile = {"roles": ["Backend Engineer"]}
        result = score_role_dimension(job, profile)
        assert result["score"] == 30


class TestComputeMatch:
    def test_target_company_adds_bonus(self):
        job = {"title": "Engineer", "description": "", "company": "Dream Co", "skills": []}
        profile_without = {}
        profile_with = {"target_companies": [{"name": "Dream Co", "tier": "dream"}]}

        without = compute_match(job, profile_without)
        with_bonus = compute_match(job, profile_with)

        assert with_bonus["is_target_company"] is True
        assert without["is_target_company"] is False
        assert with_bonus["score"] >= without["score"] + TIER_BONUSES["dream"] - 1  # rounding tolerance

    def test_target_company_bonus_caps_at_100(self):
        job = {"title": "Engineer", "description": "", "company": "Dream Co", "skills": []}
        profile = {"target_companies": [{"name": "Dream Co", "tier": "dream"}]}
        result = compute_match(job, profile)
        assert result["score"] <= 100

    def test_target_company_match_is_case_insensitive(self):
        job = {"title": "Engineer", "description": "", "company": "dream co", "skills": []}
        profile = {"target_companies": [{"name": "Dream Co", "tier": "dream"}]}
        result = compute_match(job, profile)
        assert result["is_target_company"] is True

    def test_legacy_plain_string_target_company_entries(self):
        job = {"title": "Engineer", "description": "", "company": "Acme", "skills": []}
        profile = {"target_companies": ["Acme"]}
        result = compute_match(job, profile)
        assert result["is_target_company"] is True

    def test_returns_all_five_score_components(self):
        result = compute_match({"title": "Engineer", "description": ""}, {})
        assert set(result["components"].keys()) == {"skills", "seniority", "education", "location", "role"}

    def test_reasons_capped_at_eight(self):
        job = {
            "title": "Engineer",
            "description": "",
            "skills": [f"Skill{i}" for i in range(10)],
        }
        profile = {"skills": [f"Skill{i}" for i in range(10)]}
        result = compute_match(job, profile)
        assert len(result["reasons"]) <= 8
