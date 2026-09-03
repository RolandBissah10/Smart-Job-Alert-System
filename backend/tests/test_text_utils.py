from app.services.text_utils import normalize, clean_text


class TestNormalize:
    def test_lowercases_and_strips(self):
        assert normalize("  Senior Engineer  ") == "senior engineer"

    def test_empty_string(self):
        assert normalize("") == ""

    def test_none_returns_empty_string(self):
        assert normalize(None) == ""


class TestCleanText:
    def test_collapses_internal_whitespace(self):
        assert clean_text("a   b\n\tc") == "a b c"

    def test_none_returns_empty_string(self):
        assert clean_text(None) == ""

    def test_list_is_joined(self):
        assert clean_text(["Python", "SQL", None]) == "Python SQL"

    def test_dict_is_json_serialized(self):
        result = clean_text({"a": 1})
        assert "a" in result and "1" in result

    def test_number_is_stringified(self):
        assert clean_text(42) == "42"
