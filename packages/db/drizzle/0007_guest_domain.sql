UPDATE "user" SET email = left(email, length(email) - length('@guest.lukitas.invalid')) || '@guest.wambito.invalid' WHERE lower(email) LIKE '%@guest.lukitas.invalid';
