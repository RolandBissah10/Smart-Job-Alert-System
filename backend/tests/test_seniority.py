from app.services.seniority import (
    classify_seniority_from_title,
    classify_seniority_from_years,
    classify_seniority_from_profile_level,
    level_distance,
    explain_level_match,
)


class TestClassifySeniorityFromTitle:
    def test_senior_in_title(self):
        assert classify_seniority_from_title("Senior Backend Engineer") == "senior"

    def test_manager_wins_over_senior_when_both_present(self):
        # TITLE_KEYWORDS checks director/manager/lead before senior, so
        # "Senior Manager" should resolve to "manager", not "senior".
        assert classify_seniority_from_title("Senior Engineering Manager") == "manager"

    def test_director_beats_everything(self):
        assert classify_seniority_from_title("VP of Engineering") == "director"

    def test_intern_title(self):
        assert classify_seniority_from_title("Software Engineering Intern") == "intern"

    def test_no_level_word_falls_back_to_description(self):
        assert classify_seniority_from_title("Software Engineer", "Looking for a senior developer") == "senior"

    def test_no_signal_anywhere_returns_none(self):
        assert classify_seniority_from_title("Software Engineer", "Join our team") is None

    def test_case_insensitive(self):
        assert classify_seniority_from_title("SENIOR DEVELOPER") == "senior"

    def test_lead_keyword(self):
        assert classify_seniority_from_title("Staff Engineer") == "lead"

    def test_associate_maps_to_junior(self):
        assert classify_seniority_from_title("Associate Software Engineer") == "junior"


class TestClassifySeniorityFromYears:
    def test_none_returns_none(self):
        assert classify_seniority_from_years(None) is None

    def test_under_one_year_is_intern(self):
        assert classify_seniority_from_years(0.5) == "intern"

    def test_boundary_one_year_is_junior(self):
        assert classify_seniority_from_years(1) == "junior"

    def test_two_years_is_junior(self):
        assert classify_seniority_from_years(2.9) == "junior"

    def test_boundary_three_years_is_mid(self):
        assert classify_seniority_from_years(3) == "mid"

    def test_boundary_six_years_is_senior(self):
        assert classify_seniority_from_years(6) == "senior"

    def test_many_years_still_caps_at_senior(self):
        # Individual-contributor years alone should never imply management track.
        assert classify_seniority_from_years(20) == "senior"


class TestClassifySeniorityFromProfileLevel:
    def test_known_level(self):
        assert classify_seniority_from_profile_level("Senior") == "senior"

    def test_case_and_whitespace_insensitive(self):
        assert classify_seniority_from_profile_level("  MID  ") == "mid"

    def test_mid_level_hyphenated(self):
        assert classify_seniority_from_profile_level("Mid-Level") == "mid"

    def test_unknown_level_returns_none(self):
        assert classify_seniority_from_profile_level("Principal") is None

    def test_empty_returns_none(self):
        assert classify_seniority_from_profile_level("") is None
        assert classify_seniority_from_profile_level(None) is None


class TestLevelDistance:
    def test_same_level_is_zero(self):
        assert level_distance("senior", "senior") == 0

    def test_adjacent_levels(self):
        assert level_distance("junior", "mid") == 1

    def test_far_apart_levels(self):
        assert level_distance("intern", "director") == 6

    def test_unknown_candidate_level_returns_none(self):
        assert level_distance(None, "senior") is None

    def test_unknown_job_level_returns_none(self):
        assert level_distance("senior", None) is None


class TestExplainLevelMatch:
    def test_unknown_quality_when_no_data(self):
        result = explain_level_match(None, None)
        assert result["quality"] == "unknown"

    def test_excellent_when_exact_match(self):
        result = explain_level_match("senior", "senior")
        assert result["quality"] == "excellent"

    def test_good_when_one_level_apart(self):
        result = explain_level_match("mid", "senior")
        assert result["quality"] == "good"

    def test_poor_when_far_apart(self):
        result = explain_level_match("intern", "director")
        assert result["quality"] == "poor"
