# script.nsi
# v1.6.0


#---------------------------------------------------------------------------------------------------
# Includes
#---------------------------------------------------------------------------------------------------

!include "MUI.nsh"
!include "LogicLib.nsh"
!include "${NSISDIR}\Contrib\Modern UI\System.nsh"


#---------------------------------------------------------------------------------------------------
# Plugins
#---------------------------------------------------------------------------------------------------

!addplugindir "nsis\plugin"
!include "nsis\include\nsProcess.nsh"


#---------------------------------------------------------------------------------------------------
# General
#---------------------------------------------------------------------------------------------------


!define PRODUCT "Miki Desktop"
!define VERSION "1.0.0"

Name "${PRODUCT}"
BrandingText "${PRODUCT} Installer ${VERSION}"
Caption "${PRODUCT} Installer"
UninstallCaption "${PRODUCT} Uninstaller"

!define MUI_FILE "${PRODUCT}"
!define MUI_BRANDINGTEXT "${PRODUCT}"

!define MUI_ICON "nsis\images\icon.ico"
!define MUI_UNICON "nsis\images\icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "nsis\images\icon.bmp"
!define MUI_HEADERIMAGE_RIGHT

OutFile "out/${PRODUCT} Setup ${VERSION}.exe"
CRCCheck on
ShowInstDetails nevershow
ShowUninstDetails nevershow
InstallDir "$PROGRAMFILES64\${PRODUCT}"
AutoCloseWindow false


#---------------------------------------------------------------------------------------------------
# Pages
#---------------------------------------------------------------------------------------------------

!define MUI_WELCOMEFINISHPAGE_BITMAP "nsis\images\install.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "nsis\images\uninstall.bmp"

!define WELCOME_TITLE 'Welcome to the Miki Desktop Installer.'
!define FINISH_TITLE 'Miki Desktop has finished installing.'
!define UNWELCOME_TITLE 'Welcome to the Miki Desktop Uninstaller.'
!define UNFINISH_TITLE 'Miki Desktop has finished uninstalling.'

!define MUI_WELCOMEPAGE_TITLE '${WELCOME_TITLE}'
!define MUI_WELCOMEPAGE_TITLE_3LINES
!define MUI_WELCOMEPAGE_TEXT "We're ready to install Miki Desktop on your computer.\r\n\r\nClick Next to continue."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_TEXT "Miki Desktop is installed."
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Run ${PRODUCT}"
!define MUI_FINISHPAGE_RUN_FUNCTION "LaunchLink"
!insertmacro MUI_PAGE_FINISH

!define MUI_WELCOMEPAGE_TITLE '${UNWELCOME_TITLE}'
!define MUI_WELCOMEPAGE_TITLE_3LINES
!define MUI_WELCOMEPAGE_TEXT "We're ready to uninstall Miki Desktop.\r\n\r\nClick Uninstall to start the uninstallation."
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_INSTFILES
!define MUI_FINISHPAGE_TITLE '${UNFINISH_TITLE}'
!define MUI_FINISHPAGE_TITLE_3LINES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"


#---------------------------------------------------------------------------------------------------
# Installer
#---------------------------------------------------------------------------------------------------

Section "install" Installation
  Call KillPostgres

  CreateDirectory "$APPDATA\Mimix"

  CreateDirectory "$APPDATA\Mimix\pgsql"
  SetOutPath "$APPDATA\Mimix\pgsql"
  File /r "app\pgsql\windows\*.*"

  CreateDirectory "$APPDATA\Mimix\pgdumps"
  SetOutPath "$APPDATA\Mimix\pgdumps"
  File /r "app\pgdumps\*.*"

  SetOutPath "$APPDATA\Mimix"
  File /r "app\miki"

  SetOutPath "$INSTDIR"
  File /r "out\Miki Desktop-win32-x64\*.*"

  CreateShortCut "$DESKTOP\${PRODUCT}.lnk" "$INSTDIR\${MUI_FILE}.exe" ""

  CreateDirectory "$SMPROGRAMS\${PRODUCT}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT}\Uninstall.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0
  CreateShortCut "$SMPROGRAMS\${PRODUCT}\${PRODUCT}.lnk" "$INSTDIR\${MUI_FILE}.exe" "" "$INSTDIR\${MUI_FILE}.exe" 0

  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT}" "DisplayName" "${PRODUCT}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT}" "UninstallString" "$INSTDIR\Uninstall.exe"

  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd


#---------------------------------------------------------------------------------------------------
# Uninstaller
#---------------------------------------------------------------------------------------------------

Section "Uninstall"
  RMDir /r "$INSTDIR\*.*"
  RMDir "$INSTDIR"

  Delete "$DESKTOP\${PRODUCT}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT}\*.*"
  RmDir  "$SMPROGRAMS\${PRODUCT}"

  DeleteRegKey HKLM "SOFTWARE\${PRODUCT}"
  DeleteRegKey HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT}"
SectionEnd


#---------------------------------------------------------------------------------------------------
# Functions
#---------------------------------------------------------------------------------------------------

Function LaunchLink
  ExecShell "" "$SMPROGRAMS\${PRODUCT}\${PRODUCT}.lnk"
FunctionEnd

Function KillPostgres
  StrCpy $1 "postgres.exe"
  nsProcess::_FindProcess "$1"
  Pop $R0
  ${If} $R0 = 0
    nsProcess::_KillProcess "$1"
    Pop $R0
    Sleep 500
  ${EndIf}
FunctionEnd
