# script.nsi
# v1.4.0


#---------------------------------------------------------------------------------------------------
# Includes
#---------------------------------------------------------------------------------------------------

!include "MUI.nsh"
!include "LogicLib.nsh"
!include "${NSISDIR}\Contrib\Modern UI\System.nsh"


#---------------------------------------------------------------------------------------------------
# General
#---------------------------------------------------------------------------------------------------


!define PRODUCT "Miki Desktop"
!define VERSION "1.0.0"

Name "${PRODUCT}"
BrandingText "${PRODUCT} Installer ${VERSION}"
Caption "${PRODUCT} Installer"

!define MUI_FILE "${PRODUCT}"
!define MUI_BRANDINGTEXT "${PRODUCT}"

!define MUI_ICON "nsis\icon.ico"
!define MUI_UNICON "nsis\icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "nsis\icon.bmp"
!define MUI_HEADERIMAGE_RIGHT

OutFile "out/${PRODUCT} Setup ${VERSION}.exe"
CRCCheck on
ShowInstDetails nevershow
ShowUninstDetails nevershow
InstallDir "$PROGRAMFILES64\${PRODUCT}"


#---------------------------------------------------------------------------------------------------
# Pages
#---------------------------------------------------------------------------------------------------

!define MUI_WELCOMEFINISHPAGE_BITMAP "nsis\install.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "nsis\uninstall.bmp"

!define WELCOME_TITLE 'Welcome to the Miki Desktop Installer.'
!define FINISH_TITLE 'Miki Desktop has finished installing.'
!define UNWELCOME_TITLE 'Welcome to the Miki Desktop Uninstaller.'
!define UNFINISH_TITLE 'Miki Desktop has finished uninstalling.'

!define MUI_WELCOMEPAGE_TITLE '${WELCOME_TITLE}'
!define MUI_WELCOMEPAGE_TITLE_3LINES
!define MUI_WELCOMEPAGE_TEXT 'We’re ready to setup Miki Desktop on your computer.\r\nClick Next to continue.'
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Run ${PRODUCT}"
!define MUI_FINISHPAGE_RUN_FUNCTION "LaunchLink"
!insertmacro MUI_PAGE_FINISH

!define MUI_WELCOMEPAGE_TITLE '${UNWELCOME_TITLE}'
!define MUI_WELCOMEPAGE_TITLE_3LINES
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

  DeleteRegKey HKEY_LOCAL_MACHINE "SOFTWARE\${PRODUCT}"
  DeleteRegKey HKEY_LOCAL_MACHINE "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT}"
SectionEnd


#---------------------------------------------------------------------------------------------------
# Functions
#---------------------------------------------------------------------------------------------------

Function .onInstSuccess
  MessageBox MB_OK "You have successfully installed ${PRODUCT}."
FunctionEnd

Function un.onUninstSuccess
  MessageBox MB_OK "You have successfully uninstalled ${PRODUCT}."
FunctionEnd

Function LaunchLink
  ExecShell "" "$SMPROGRAMS\${PRODUCT}\${PRODUCT}.lnk"
FunctionEnd
