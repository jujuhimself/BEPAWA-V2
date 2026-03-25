-- Deactivate admin user's staff_members records to prevent session hijacking
UPDATE staff_members SET is_active = false 
WHERE user_id = '370f38d5-909a-4a30-8b16-c4aba3c8649b';
