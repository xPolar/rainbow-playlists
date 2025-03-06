# rainbow-playlists

a web application that transforms your spotify playlists into beautiful rainbow-sorted collections based on album cover colors.

## development

### prerequisites

- node.js (lts version)
- pnpm
- spotify developer account

### getting started

1. clone the repository

```bash
git clone https://github.com/yourusername/rainbow-playlists.git
cd rainbow-playlists
```

2. install dependencies

```bash
pnpm install
```

3. create a `.env.local` file with your spotify api credentials

```
SPOTIFY_CLIENT_ID=your_client_id
```

4. run the development server

```bash
pnpm dev
```

5. open [http://localhost:3000](http://localhost:3000) in your browser

### scripts

- `pnpm dev`: run development server with turbopack
- `pnpm build`: build for production
- `pnpm start`: start production server
- `pnpm format`: format code with biome
- `pnpm check`: check and fix linting issues with biome
