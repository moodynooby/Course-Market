declare module '@mui/material/styles' {
  interface Palette {
    accent: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    // MUI3 Surface Container tokens for tonal elevation
    surface: {
      default: string;
      dim: string;
      bright: string;
      containerLowest: string;
      containerLow: string;
      container: string;
      containerHigh: string;
      containerHighest: string;
    };
  }
  interface PaletteOptions {
    accent?: {
      main?: string;
      light?: string;
      dark?: string;
      contrastText?: string;
    };
    // MUI3 Surface Container tokens for tonal elevation
    surface?: {
      default?: string;
      dim?: string;
      bright?: string;
      containerLowest?: string;
      containerLow?: string;
      container?: string;
      containerHigh?: string;
      containerHighest?: string;
    };
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    accent: true;
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    accent: true;
  }
}

declare module '@mui/material/Fab' {
  interface FabPropsColorOverrides {
    accent: true;
  }
}

declare module '@mui/material/SvgIcon' {
  interface SvgIconPropsColorOverrides {
    accent: true;
  }
}
