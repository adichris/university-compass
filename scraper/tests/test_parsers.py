from datetime import date

from uc_scraper.parsers import parse_cutoffs, parse_deadlines


def test_matches_known_programmes_to_aggregates():
    known = {"ug-medicine": "Medicine (MBChB)", "ug-law": "Bachelor of Laws (LLB)", "ug-nursing": "BSc Nursing"}
    text = """
    COLLEGE OF HEALTH SCIENCES
    Bachelor of Medicine and Surgery (MBChB)      07
    BSc. Nursing                                  12   18
    Random heading 2026
    """
    by_id = {p["programme_id"]: p for p in parse_cutoffs(text, known)}
    assert by_id["ug-nursing"]["cutoff"] == 12
    assert "ug-law" not in by_id


def test_finds_future_deadlines_near_keywords():
    text = "Applications open 6 August 2026.\nThe application deadline is 4 November 2026 at 12:00 GMT."
    found = parse_deadlines(text, today=date(2026, 9, 1))
    assert found[0]["date"] == "2026-11-04"
