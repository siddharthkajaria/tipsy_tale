class Api::V1::UploadsController < ApplicationController
    protect_from_forgery with: :null_session # Disable CSRF for API requests
    before_action :set_cors_headers

      def create
        if params[:image].present?
          uploaded_io = params[:image]

          # Generate a random filename
          filename = "#{SecureRandom.hex(10)}_#{uploaded_io.original_filename}"
          filepath = Rails.root.join('public', 'uploads', filename)

          # Save the uploaded file
          File.open(filepath, 'wb') do |file|
            file.write(uploaded_io.read)
          end

          # Construct the public URL
          image_url = "#{request.base_url}/uploads/#{filename}"

          render json: { success: true, url: image_url }, status: :created
        else
          render json: { success: false, error: "No image uploaded" }, status: :bad_request
        end
      end

      private

    def set_cors_headers
        response.set_header('Access-Control-Allow-Origin', 'https://www.thetipsytale.com')
        response.set_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.set_header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization')
    end
end
