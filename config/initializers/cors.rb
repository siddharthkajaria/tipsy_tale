Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
      origins 'https://www.thetipsytale.com'
  
      resource '*',
        headers: :any,
        expose: ['Authorization', 'access-token', 'client', 'uid', 'token-type'],  # expose things if needed
        methods: [:get, :post, :put, :patch, :delete, :options, :head],
        credentials: true
    end
  end