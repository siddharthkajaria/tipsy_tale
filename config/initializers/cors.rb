Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
      origins '*'
  
      resource '/api/v1/uploads',
        headers: :any,
        methods: [:post],
        expose: ['Authorization'],
        credentials: false
    end
  end