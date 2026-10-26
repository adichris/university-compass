from uc_scraper.build import (DEGREE_RULES, DIPLOMA_RULES, HND_RULES, acronym, best_curated_match, field_of,
                              level_of, match, region_for)


def test_award_levels():
    assert level_of("BSc") == "degree"
    assert level_of("B.Ed") == "degree"
    assert level_of("LLB") == "degree"
    assert level_of("HND") == "hnd"
    assert level_of("Diploma") == "diploma"
    assert level_of("MPhil") == "postgrad"
    assert level_of("PhD") == "postgrad"
    assert level_of("Certificate") is None
    assert level_of("Doctor", "Pharmacy") == "degree"
    assert level_of("Doctor", "Business Administration") == "postgrad"
    assert level_of("Post", "Graduate Diploma in Statistics") == "postgrad"


def test_programme_templates():
    assert match(DEGREE_RULES, "BSc Computer Science") == "computer-science"
    assert match(DEGREE_RULES, "BSc Nursing") == "nursing"
    assert match(DEGREE_RULES, "B.Ed Early Grade Education") == "bed-basic"
    assert match(DEGREE_RULES, "BSc Mathematics Education") == "bed-maths"
    assert match(HND_RULES, "HND Accountancy") == "hnd-business"
    assert match(HND_RULES, "HND Electrical/Electronic Engineering") == "hnd-engineering"
    assert match(DIPLOMA_RULES, "Diploma Registered General Nursing") == "diploma-nursing"
    assert match(DEGREE_RULES, "BA Akan Studies") is None


def test_regions_from_location():
    assert region_for("P. O. Box GP 561, Barnes Road, Accra", "Accra Technical University")[0] == "Greater Accra"
    assert region_for("Cape Coast, Central Region", "")[0] == "Central"
    assert region_for("Bolgatanga", "")[0] == "Upper East"
    assert region_for("Wa", "Dr. Hilla Limann Technical University")[0] == "Upper West"


def test_names():
    assert acronym("Ada College of Education") == "ACE"
    curated = [{"slug": "knust", "name": "Kwame Nkrumah University of Science and Technology", "short": "KNUST"}]
    assert best_curated_match("Kwame Nkrumah University of Science & Technology", curated)["slug"] == "knust"
    assert best_curated_match("Kumasi Technical University", curated) is None
    tus = [{"slug": "atu", "name": "Accra Technical University", "short": "ATU"}]
    assert best_curated_match("Tamale Technical University", tus) is None
    assert best_curated_match("Accra Technical University", tus)["slug"] == "atu"


def test_fields():
    assert field_of("Midwifery", "x") == "health"
    assert field_of("Procurement and Supply Chain", "x") == "business"
