from app.services.matcher import (
    match_location,
    _match_job_type,
    _match_work_authorization,
    passes_hard_gates,
    count_keyword_hits,
    profile_has_match_criteria,
    get_match_source,
)


class TestMatchLocation:
    def test_no_preference_matches_anything(self):
        assert match_location({"location": "Onsite in Paris"}, {"location": ""}) is True

    def test_remote_preference_matches_anything(self):
        # match_location treats an explicit "Remote" preference the same as no
        # preference at all - it never filters OUT non-remote jobs.
        assert match_location({"location": "On-Premises, Chicago"}, {"location": "Remote"}) is True

    def test_hybrid_preference_requires_hybrid_in_job(self):
        assert match_location({"location": "Hybrid - NYC"}, {"location": "Hybrid"}) is True
        assert match_location({"location": "Fully remote"}, {"location": "Hybrid"}) is False

    def test_on_premises_preference_requires_onsite_terms(self):
        assert match_location({"location": "On-site, Berlin"}, {"location": "On-Premises"}) is True
        assert match_location({"location": "Remote"}, {"location": "On-Premises"}) is False

    def test_any_preference_maps_to_no_filter(self):
        # The frontend's "Any" job-type / location option sends an empty string
        # to the backend - covered here to guard the contract between them.
        assert match_location({"location": "Onsite"}, {"location": ""}) is True


class TestMatchJobType:
    def test_no_preference_matches_anything(self):
        assert _match_job_type({"title": "Contractor", "description": ""}, {"job_type": ""}) is True

    def test_full_time_excludes_contract_titles(self):
        job = {"title": "Backend Engineer (Contract)", "description": ""}
        assert _match_job_type(job, {"job_type": "Full-time"}) is False

    def test_full_time_accepts_plain_titles(self):
        job = {"title": "Backend Engineer", "description": "Full-time role"}
        assert _match_job_type(job, {"job_type": "Full-time"}) is True

    def test_part_time_requires_part_time_mention(self):
        assert _match_job_type({"title": "Support Rep", "description": "Part-time"}, {"job_type": "Part-time"}) is True
        assert _match_job_type({"title": "Support Rep", "description": "40 hrs/week"}, {"job_type": "Part-time"}) is False

    def test_internship_requires_intern_mention(self):
        assert _match_job_type({"title": "Data Intern", "description": ""}, {"job_type": "Internship"}) is True

    def test_freelance_requires_freelance_mention(self):
        assert _match_job_type({"title": "Designer", "description": "Freelance, remote"}, {"job_type": "Freelance"}) is True
        assert _match_job_type({"title": "Designer", "description": "Full-time"}, {"job_type": "Freelance"}) is False


class TestMatchWorkAuthorization:
    def test_job_with_no_statement_always_passes(self):
        job = {"title": "Engineer", "description": "Great team, great pay"}
        profile = {"work_authorization": "I need sponsorship"}
        assert _match_work_authorization(job, profile) is True

    def test_no_sponsorship_job_excludes_candidate_who_needs_it(self):
        job = {"title": "Engineer", "description": "No sponsorship available for this role"}
        profile = {"work_authorization": "I need sponsorship to work in the US"}
        assert _match_work_authorization(job, profile) is False

    def test_no_sponsorship_job_still_passes_candidate_with_no_stated_need(self):
        job = {"title": "Engineer", "description": "No sponsorship available"}
        profile = {"work_authorization": "US citizen"}
        assert _match_work_authorization(job, profile) is True

    def test_negation_guard_dont_need_sponsorship_is_not_flagged(self):
        # "I don't need sponsorship" must NOT be read as "needs sponsorship" -
        # this is the exact double-negative bug the negation guard exists for.
        job = {"title": "Engineer", "description": "Citizens only"}
        profile = {"work_authorization": "I don't need sponsorship"}
        assert _match_work_authorization(job, profile) is True

    def test_negation_guard_do_not_require_visa(self):
        job = {"title": "Engineer", "description": "Must be authorized to work in the US"}
        profile = {"work_authorization": "I do not require a visa"}
        assert _match_work_authorization(job, profile) is True

    def test_negation_guard_no_longer_need_sponsorship(self):
        job = {"title": "Engineer", "description": "work permit required"}
        profile = {"work_authorization": "I no longer need sponsorship"}
        assert _match_work_authorization(job, profile) is True

    def test_ambiguous_profile_text_defaults_to_passing(self):
        # Conservative by design: never auto-reject on unclear data.
        job = {"title": "Engineer", "description": "No sponsorship"}
        profile = {"work_authorization": ""}
        assert _match_work_authorization(job, profile) is True


class TestPassesHardGates:
    def test_all_gates_pass(self):
        job = {"title": "Engineer", "description": "Great role", "location": "Remote"}
        profile = {"location": "Remote", "job_type": "", "work_authorization": ""}
        assert passes_hard_gates(job, profile) is True

    def test_fails_on_location_alone(self):
        job = {"title": "Engineer", "description": "", "location": "Onsite only"}
        profile = {"location": "Hybrid", "job_type": "", "work_authorization": ""}
        assert passes_hard_gates(job, profile) is False


class TestCountKeywordHits:
    def test_matches_are_case_insensitive(self):
        assert count_keyword_hits("senior python engineer", ["Python"]) == ["Python"]

    def test_no_match_returns_empty(self):
        assert count_keyword_hits("java developer", ["Python", "Go"]) == []

    def test_preserves_original_casing_of_keyword_not_text(self):
        hits = count_keyword_hits("we use react and aws", ["React", "AWS"])
        assert hits == ["React", "AWS"]

    def test_dedupes_repeated_keywords(self):
        assert count_keyword_hits("python python python", ["Python", "Python"]) == ["Python"]

    def test_empty_keyword_is_skipped(self):
        assert count_keyword_hits("python", ["", "Python"]) == ["Python"]


class TestGetMatchSource:
    def test_defaults_to_profile(self):
        assert get_match_source({}) == "profile"

    def test_invalid_value_falls_back_to_profile(self):
        assert get_match_source({"match_source": "bogus"}) == "profile"

    def test_valid_values_pass_through(self):
        for value in ("profile", "cv", "both"):
            assert get_match_source({"match_source": value}) == value


class TestProfileHasMatchCriteria:
    def test_profile_mode_needs_skills_or_roles(self):
        assert profile_has_match_criteria({"match_source": "profile", "skills": ["Python"]}) is True
        assert profile_has_match_criteria({"match_source": "profile"}) is False

    def test_cv_mode_needs_cv_keywords(self):
        assert profile_has_match_criteria({"match_source": "cv", "cv_keywords": ["python"]}) is True
        assert profile_has_match_criteria({"match_source": "cv", "skills": ["Python"]}) is False

    def test_both_mode_accepts_either(self):
        assert profile_has_match_criteria({"match_source": "both", "skills": ["Python"]}) is True
        assert profile_has_match_criteria({"match_source": "both", "cv_keywords": ["python"]}) is True
        assert profile_has_match_criteria({"match_source": "both"}) is False
