-- Which family a married couple is shown with in the tree when both
-- spouses have parents recorded: 'husband' (default when NULL) or 'wife'
-- (e.g. illarikam, the son-in-law living with the wife's family).
ALTER TABLE relationships
  ADD COLUMN IF NOT EXISTS placement TEXT
  CHECK (placement IS NULL OR placement IN ('husband', 'wife'));
