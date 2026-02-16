-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', FALSE);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', TRUE);
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', TRUE);

-- CV bucket policies
CREATE POLICY "Recruiters upload CVs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cvs' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authorized users view CVs" ON storage.objects FOR SELECT USING (bucket_id = 'cvs' AND auth.uid() IS NOT NULL);

-- Avatar bucket
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Logo bucket
CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Companies upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);
