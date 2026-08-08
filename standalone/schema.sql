-- 本地独立运行初始化 schema (PostgreSQL)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated_') THEN
    CREATE ROLE authenticated_;
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON SCHEMA public TO authenticated_;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated_;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated_;

CREATE TABLE IF NOT EXISTS conversation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL DEFAULT '新对话',
  model_config_id uuid,
  user_id varchar(255) NOT NULL,
  last_message_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  role varchar(20) NOT NULL,
  content text NOT NULL,
  tool_calls jsonb,
  tool_call_id varchar(255),
  tool_name varchar(255),
  status varchar(20) NOT NULL DEFAULT 'success',
  order_index integer NOT NULL DEFAULT 0,
  token_usage jsonb,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT message_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_message_conversation_id ON message(conversation_id);

CREATE TABLE IF NOT EXISTS model_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  api_url varchar(500) NOT NULL,
  api_key varchar(500) NOT NULL,
  model_name varchar(255) NOT NULL,
  model_type varchar(20) NOT NULL DEFAULT 'remote',
  api_format varchar(20) NOT NULL DEFAULT 'openai',
  max_tokens integer NOT NULL DEFAULT 4096,
  system_prompt text,
  is_default boolean NOT NULL DEFAULT false,
  thinking_level integer NOT NULL DEFAULT 50,
  user_id varchar(255) NOT NULL,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plugin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_key varchar(255) NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  version varchar(50),
  author varchar(255),
  category varchar(50),
  icon varchar(255),
  installed boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  config_schema jsonb,
  config_values jsonb,
  user_id varchar(255) NOT NULL,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme varchar(50) NOT NULL DEFAULT 'liquid-glass',
  nickname varchar(255),
  avatar_url varchar(500),
  font_size varchar(20) NOT NULL DEFAULT 'medium',
  bubble_style varchar(20) NOT NULL DEFAULT 'rounded',
  ai_name varchar(255) NOT NULL DEFAULT 'AI',
  ai_avatar varchar(500),
  show_message_time boolean NOT NULL DEFAULT false,
  show_token_usage boolean NOT NULL DEFAULT false,
  background varchar(1000),
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  workspace_dir varchar(1000),
  user_id varchar(255) NOT NULL UNIQUE,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(255) NOT NULL,
  content text NOT NULL,
  category varchar(50) NOT NULL DEFAULT 'life',
  starred boolean NOT NULL DEFAULT true,
  source_conversation_id uuid,
  source_message_id uuid,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_memory_user ON memory(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_category ON memory(user_id, category);

-- 兼容旧库：补齐新列
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_preference')
    AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_preference' AND column_name = 'ai_name') THEN
    ALTER TABLE user_preference ADD COLUMN ai_name varchar(255) NOT NULL DEFAULT 'AI';
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_preference')
    AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_preference' AND column_name = 'ai_avatar') THEN
    ALTER TABLE user_preference ADD COLUMN ai_avatar varchar(500);
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_preference')
    AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_preference' AND column_name = 'show_message_time') THEN
    ALTER TABLE user_preference ADD COLUMN show_message_time boolean NOT NULL DEFAULT false;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_preference')
    AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_preference' AND column_name = 'show_token_usage') THEN
    ALTER TABLE user_preference ADD COLUMN show_token_usage boolean NOT NULL DEFAULT false;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_preference')
    AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_preference' AND column_name = 'background') THEN
    ALTER TABLE user_preference ADD COLUMN background varchar(1000);
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'model_config')
    AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'model_config' AND column_name = 'thinking_level') THEN
    ALTER TABLE model_config ADD COLUMN thinking_level integer NOT NULL DEFAULT 50;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'message')
    AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'message' AND column_name = 'token_usage') THEN
    ALTER TABLE message ADD COLUMN token_usage jsonb;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_preference')
    AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_preference' AND column_name = 'feature_flags') THEN
    ALTER TABLE user_preference ADD COLUMN feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_preference')
    AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_preference' AND column_name = 'workspace_dir') THEN
    ALTER TABLE user_preference ADD COLUMN workspace_dir varchar(1000);
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'model_config')
    AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'model_config' AND column_name = 'api_format') THEN
    ALTER TABLE model_config ADD COLUMN api_format varchar(20) NOT NULL DEFAULT 'openai';
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'model_config')
    AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'model_config' AND column_name = 'max_tokens') THEN
    ALTER TABLE model_config ADD COLUMN max_tokens integer NOT NULL DEFAULT 4096;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'model_config')
    AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'model_config' AND column_name = 'system_prompt') THEN
    ALTER TABLE model_config ADD COLUMN system_prompt text;
  END IF;
END
$$;
