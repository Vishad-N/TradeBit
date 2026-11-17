-- "Delete" now archives instead of erasing. Archived rows are hidden by the app but every row that hangs off them is kept.
ALTER TABLE "Book"         ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Course"       ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "CourseModule" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Lesson"       ADD COLUMN "archivedAt" TIMESTAMP(3);

-- No delete may ever cascade into another table. Every foreign key below becomes ON DELETE RESTRICT: the database itself
-- refuses to delete a row that others still reference, whatever code (or hand-typed SQL) tries it. The one cascade that stays
-- is Task -> TaskBook, which is just the task's own list of linked books.
-- Constraint names are looked up rather than assumed, so this works whatever the earlier migrations called them.
DO $$
DECLARE
  r record;
  cname text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('TaskBook',          'bookId',   'Book'),
    ('TaskSubmission',    'userId',   'User'),
    ('ReadingAccess',     'userId',   'User'),
    ('ReadingAccess',     'bookId',   'Book'),
    ('ReadingProgress',   'userId',   'User'),
    ('ReadingProgress',   'bookId',   'Book'),
    ('ReadingSession',    'userId',   'User'),
    ('ReadingSession',    'bookId',   'Book'),
    ('MentorshipPayment', 'userId',   'User'),
    ('MentorshipAccess',  'userId',   'User'),
    ('CourseModule',      'courseId', 'Course'),
    ('Lesson',            'moduleId', 'CourseModule'),
    ('LessonProgress',    'userId',   'User'),
    ('LessonProgress',    'lessonId', 'Lesson'),
    ('CourseEnrollment',  'userId',   'User'),
    ('CourseEnrollment',  'courseId', 'Course'),
    ('ProgramEnrollment', 'userId',   'User'),
    ('ProgramPayment',    'userId',   'User'),
    ('TelegramLink',      'userId',   'User')
  ) AS t(tbl, col, ref) LOOP
    SELECT c.conname INTO cname
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
     WHERE c.contype = 'f'
       AND c.conrelid = to_regclass(quote_ident(r.tbl))
       AND a.attname = r.col
     LIMIT 1;
    IF cname IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.tbl, cname);
    END IF;
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I("id") ON DELETE RESTRICT ON UPDATE CASCADE',
      r.tbl, r.tbl || '_' || r.col || '_fkey', r.col, r.ref
    );
    cname := NULL;
  END LOOP;
END $$;
