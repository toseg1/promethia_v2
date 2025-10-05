
  # Promethia Authentication Framework

  This is a code bundle for Promethia Authentication Framework. The original project is available at https://www.figma.com/design/moIHZ9fMoJzdwgwb5t6EGu/Promethia-Authentication-Framework.

  ## Running the code

  1. Install dependencies

     ```bash
     npm install
     ```

  2. Provide the required environment variables by copying `.env.example`
     to `.env` and setting the correct API URL:

     ```bash
     cp .env.example .env
     # Edit .env and set VITE_DJANGO_API_URL=https://api.promethia.app/api/v1
     ```

  3. Start the development server

     ```bash
     npm run dev
     ```

  ### Available environment variables

  - `VITE_DJANGO_API_URL` (required): points to the Django REST API, defaults to
    `http://localhost:8000/api/v1` for local development.
  - `VITE_DJANGO_WS_URL` (optional): WebSocket endpoint if real-time features are enabled.
  
