from app.services.profile_utils import (
    get_profile_skills,
    profile_has_structured_data,
    cached_on_profile,
    build_match_profile,
)


class TestGetProfileSkills:
    def test_prefers_skills_field(self):
        assert get_profile_skills({"skills": ["Python"], "tech_stack": ["Go"]}) == ["Python"]

    def test_falls_back_to_legacy_tech_stack(self):
        assert get_profile_skills({"tech_stack": ["Go"]}) == ["Go"]

    def test_empty_skills_list_falls_back_to_tech_stack(self):
        # skills=[] is falsy, so "skills or tech_stack" should fall through.
        assert get_profile_skills({"skills": [], "tech_stack": ["Go"]}) == ["Go"]

    def test_neither_present_returns_empty_list(self):
        assert get_profile_skills({}) == []


class TestProfileHasStructuredData:
    def test_true_with_skills(self):
        assert profile_has_structured_data({"skills": ["Python"]}) is True

    def test_true_with_roles(self):
        assert profile_has_structured_data({"roles": ["Engineer"]}) is True

    def test_false_when_empty(self):
        assert profile_has_structured_data({}) is False


class TestCachedOnProfile:
    def test_computes_once_and_reuses_cached_value(self):
        profile = {}
        calls = []

        def compute():
            calls.append(1)
            return "computed-value"

        first = cached_on_profile(profile, "some_key", compute)
        second = cached_on_profile(profile, "some_key", compute)

        assert first == "computed-value"
        assert second == "computed-value"
        assert len(calls) == 1  # compute() only ran once

    def test_different_keys_compute_independently(self):
        profile = {}
        assert cached_on_profile(profile, "a", lambda: "A") == "A"
        assert cached_on_profile(profile, "b", lambda: "B") == "B"

    def test_cache_does_not_leak_across_separate_profile_dicts(self):
        profile1 = {}
        profile2 = {}
        cached_on_profile(profile1, "key", lambda: "from-profile-1")
        result = cached_on_profile(profile2, "key", lambda: "from-profile-2")
        assert result == "from-profile-2"


class TestBuildMatchProfile:
    def test_folds_cv_fields_into_profile(self):
        user = {
            "profile": {"skills": ["Python"]},
            "match_source": "both",
            "cv_data": {
                "keywords": ["python", "sql"],
                "skills": ["Python"],
                "certifications": ["AWS Certified"],
                "years_experience": 5,
                "education": [{"degree": "BSc"}],
                "seniority": "senior",
            },
        }
        profile = build_match_profile(user)
        assert profile["skills"] == ["Python"]
        assert profile["match_source"] == "both"
        assert profile["cv_keywords"] == ["python", "sql"]
        assert profile["cv_years_experience"] == 5
        assert profile["cv_seniority"] == "senior"

    def test_missing_cv_data_defaults_gracefully(self):
        user = {"profile": {}, "match_source": "profile"}
        profile = build_match_profile(user)
        assert profile["cv_keywords"] == []
        assert profile["cv_years_experience"] is None

    def test_does_not_mutate_the_original_user_profile_dict(self):
        original_profile = {"skills": ["Python"]}
        user = {"profile": original_profile, "match_source": "profile"}
        build_match_profile(user)
        assert "match_source" not in original_profile
