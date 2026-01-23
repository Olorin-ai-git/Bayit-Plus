"""
Cultural References Data

Data organized by category for the cultural references seeder.
"""

from scripts.olorin.seeder.data.politicians import POLITICIANS
from scripts.olorin.seeder.data.parties import POLITICAL_PARTIES
from scripts.olorin.seeder.data.holidays import HOLIDAYS
from scripts.olorin.seeder.data.events import HISTORICAL_EVENTS
from scripts.olorin.seeder.data.military import MILITARY_TERMS
from scripts.olorin.seeder.data.slang import HEBREW_SLANG
from scripts.olorin.seeder.data.places import PLACES
from scripts.olorin.seeder.data.legal import LEGAL_TERMS
from scripts.olorin.seeder.data.cultural_figures import CULTURAL_FIGURES

# Aggregate all references
ALL_REFERENCES = (
    POLITICIANS
    + POLITICAL_PARTIES
    + HOLIDAYS
    + HISTORICAL_EVENTS
    + MILITARY_TERMS
    + HEBREW_SLANG
    + PLACES
    + LEGAL_TERMS
    + CULTURAL_FIGURES
)

__all__ = [
    "POLITICIANS",
    "POLITICAL_PARTIES",
    "HOLIDAYS",
    "HISTORICAL_EVENTS",
    "MILITARY_TERMS",
    "HEBREW_SLANG",
    "PLACES",
    "LEGAL_TERMS",
    "CULTURAL_FIGURES",
    "ALL_REFERENCES",
]
