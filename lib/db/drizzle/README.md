# Migration review status

`0000_crazy_mole_man.sql` is a generated full-schema baseline because this repository previously used `drizzle-kit push` without migration snapshots.

It is suitable only for a new empty database. It was reviewed and **not applied**: running it against an existing Jam3ty database would collide with existing enums/tables. Establish a baseline or produce a reviewed incremental diff before migrating an existing development or production database, preserving all subscription and payment rows.
