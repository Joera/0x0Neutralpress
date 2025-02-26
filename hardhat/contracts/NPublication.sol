// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/utils/Create2Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title NPublication
 * @dev Multi-signature controlled publication contract with author whitelisting and content management
 */
contract NPublication is 
    Initializable,
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable 
{   
    using AddressUpgradeable for address;

    struct Proposal {
        uint256 id;
        address proposer;
        bytes data;
        uint256 approvalCount;
        bool executed;
        uint256 createdAt;
        uint256 expiresAt;
        mapping(address => bool) hasVoted;
    }

    // Constants
    uint256 public constant MAX_OWNERS = 10;
    uint256 public constant PROPOSAL_EXPIRATION_PERIOD = 7 days;
    uint256 public constant MAX_WHITELISTED_AUTHORS = 100;

    // State variables
    address[] private owners;
    uint256 private required;
    uint256 private proposalCount;
    mapping(uint256 => Proposal) public proposals;
    address private printer;
    string private config;
    string private html_root;
    address[] private whitelisted_authors; 
    address private occupied_by;     
    
    // Events
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, bytes data, uint256 expiresAt);
    event ProposalApproved(uint256 indexed proposalId, address indexed approver);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalExpired(uint256 indexed proposalId);
    event NOffer(address indexed author, address indexed publication, string indexed content);
    event NRootUpdate(string html_root);
    event NConfigUpdate(string config);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event EmergencyShutdown(address indexed triggeredBy);
    event EmergencyRecovery(address indexed triggeredBy);
    event ContractUpgraded(address indexed implementation);

    // Custom errors
    error InvalidOwnerCount();
    error InvalidRequiredCount();
    error InvalidOwnerAddress();
    error InvalidPrinterAddress();
    error NotAnOwner();
    error NotPrinter();
    error ProposalNotFound();
    error ProposalAlreadyExecuted();
    error ProposalHasExpired();
    error AlreadyVoted();
    error ExecutionFailed();
    error MaxOwnersReached();
    error MaxAuthorsReached();
    error InvalidProposalData();
    error UnauthorizedCall();
    error InvalidAuthorAddress();
    error NotAuthorizedToUpgrade();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract replacing the constructor for upgradeable contracts
     * @param _owners Array of initial owner addresses
     * @param _required Number of required approvals for proposals
     * @param _printer Address of the printer contract
     * @param _config Initial configuration string
     * @param _html_root Initial HTML root string
     */
    function initialize(
        address[] memory _owners,
        uint256 _required,
        address _printer,
        string memory _config,
        string memory _html_root
    ) public initializer {
        if (_owners.length == 0 || _owners.length > MAX_OWNERS) revert InvalidOwnerCount();
        if (_required == 0 || _required > _owners.length) revert InvalidRequiredCount();
        if (_printer == address(0)) revert InvalidPrinterAddress();
        
        for(uint i = 0; i < _owners.length; i++) {
            if (_owners[i] == address(0)) revert InvalidOwnerAddress();
            if (_inArray(owners, _owners[i])) revert InvalidOwnerAddress();
            owners.push(_owners[i]);
        }
        
        required = _required;
        config = _config;
        html_root = _html_root;
        printer = _printer;
        occupied_by = address(0);

        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
    }

    /**
     * @dev Function that should revert when `msg.sender` is not authorized to upgrade the contract. Called by
     * {upgradeTo} and {upgradeToAndCall}.
     */
    function _authorizeUpgrade(address) internal override whenNotPaused {
        if (!_isOwner(msg.sender)) revert NotAuthorizedToUpgrade();
        emit ContractUpgraded(msg.sender);
    }

    /**
     * @dev Internal function to check if an address exists in an array
     * @param _array Array to search in
     * @param _address Address to search for
     * @return bool True if address is found
     */
    function _inArray(address[] memory _array, address _address) private pure returns (bool) {
        for (uint i = 0; i < _array.length; i++) {
            if (_array[i] == _address) {
                return true;
            } 
        }
        return false;
    }

    /**
     * @dev Create a new proposal
     * @param _data Encoded function call data
     * @return proposalId ID of the created proposal
     */
    function createProposal(bytes memory _data) public nonReentrant whenNotPaused returns (uint256) {
        if (_data.length < 4) revert InvalidProposalData();
        
        uint256 proposalId = proposalCount++;
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.data = _data;
        proposal.approvalCount = 1;
        proposal.executed = false;
        proposal.createdAt = block.timestamp;
        proposal.expiresAt = block.timestamp + PROPOSAL_EXPIRATION_PERIOD;
        proposal.hasVoted[msg.sender] = true;

        emit ProposalCreated(proposalId, msg.sender, _data, proposal.expiresAt);

        // Check if proposal should be executed immediately
        if (proposal.approvalCount >= required) {
            _executeProposal(proposal);
        }

        return proposalId;
    }

    /**
     * @dev Approve an existing proposal
     * @param _proposalId ID of the proposal to approve
     */
    function approveProposal(uint256 _proposalId) 
        public 
        nonReentrant 
        whenNotPaused 
        validProposal(_proposalId) 
    {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.hasVoted[msg.sender]) revert AlreadyVoted();

        proposal.approvalCount++;
        proposal.hasVoted[msg.sender] = true;

        emit ProposalApproved(_proposalId, msg.sender);

        if (proposal.approvalCount >= required) {
            _executeProposal(proposal);
        }
    }

    /**
     * @dev Internal function to execute a proposal
     * @param proposal Proposal to execute
     */
    function _executeProposal(Proposal storage proposal) private {
        proposal.executed = true;

        (bool success, ) = address(this).call(proposal.data);
        if (!success) revert ExecutionFailed();

        emit ProposalExecuted(proposal.id);
    }

    /**
     * @dev Propose to whitelist a new author and automatically approve if caller is owner
     * @param _author Address of the author to whitelist
     */
    function proposeWhitelistAuthor(address _author) external whenNotPaused {
        if (_author == address(0)) revert InvalidAuthorAddress();
        if (whitelisted_authors.length >= MAX_WHITELISTED_AUTHORS) revert MaxAuthorsReached();
        
        bytes memory data = abi.encodeWithSignature("_whitelistAuthor(address)", _author);
        uint256 proposalId = createProposal(data);

        // If the caller is an owner, their vote is already counted in createProposal
        // If proposal meets required approvals, it will be executed automatically
    }

    /**
     * @dev Internal function to whitelist an author
     * @param _author Address of the author to whitelist
     */
    function _whitelistAuthor(address _author) external {
        if (msg.sender != address(this)) revert UnauthorizedCall();
        if (!_inArray(whitelisted_authors, _author)) {
            whitelisted_authors.push(_author);
        }
    }

    /**
     * @dev Propose to update the configuration
     * @param _config New configuration string
     */
    function proposeUpdateConfig(string calldata _config) external whenNotPaused {
        bytes memory data = abi.encodeWithSignature("_updateConfig(string)", _config);
        createProposal(data);
    }

    /**
     * @dev Internal function to update configuration
     * @param _config New configuration string
     */
    function _updateConfig(string calldata _config) external {
        if (msg.sender != address(this)) revert UnauthorizedCall();
        config = _config;
        emit NConfigUpdate(config);
    }

    /**
     * @dev Accept an offer from an author
     * @param author Author's address
     * @param publication Publication address
     * @param content_cid Content identifier
     * @return bool True if author is whitelisted
     */
    function acceptOffer(
        address author,
        address publication,
        string calldata content_cid
    ) 
        external 
        whenNotPaused 
        returns (bool) 
    {
        emit NOffer(msg.sender, publication, content_cid);
        return _inArray(whitelisted_authors, author);
    }

    /**
     * @dev Initialize an update process
     * @return string Current HTML root
     */
    function initUpdate() 
        external 
        whenNotPaused 
        returns(string memory) 
    {
        if(occupied_by == address(0)) {
            occupied_by = msg.sender;
            return html_root;
        }
        return "";
    }

    /**
     * @dev Update the HTML root
     * @param _html_root New HTML root string
     */
    function updateHtmlRoot(
        string calldata _html_root
    ) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        if(occupied_by == msg.sender) {
            html_root = _html_root;
            emit NRootUpdate(html_root);
            occupied_by = address(0);
        } 
    }

    /**
     * @dev Emergency pause contract
     */
    function emergencyPause() external {
        _pause();
        emit EmergencyShutdown(msg.sender);
    }

    /**
     * @dev Emergency unpause contract
     */
    function emergencyUnpause() external {
        _unpause();
        emit EmergencyRecovery(msg.sender);
    }

    // View functions
    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getProposalCount() external view returns (uint256) {
        return proposalCount;
    }

    function getConfig() external view returns (string memory) {
        return config;
    }

    function getHtmlRoot() external view returns (string memory) {
        return html_root;
    }

    function getWhitelistedAuthors() external view returns (address[] memory) {
        return whitelisted_authors;
    }

    modifier validProposal(uint256 _proposalId) {
        if (_proposalId >= proposalCount) revert ProposalNotFound();
        if (proposals[_proposalId].executed) revert ProposalAlreadyExecuted();
        if (block.timestamp > proposals[_proposalId].expiresAt) {
            emit ProposalExpired(_proposalId);
            revert ProposalHasExpired();
        }
        _;
    }

    function _isOwner(address _address) internal view returns (bool) {
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == _address) {
                return true;
            }
        }
        return false;
    }
} 

/**
 * @title NPublicationFactory
 * @dev Factory contract for creating new NPublication instances using UUPS proxy pattern
 */
contract NPublicationFactory {
    using Create2Upgradeable for bytes32;

    event PublicationCreated(address indexed publicationAddress, address[] owners, uint256 required);
    
    address public immutable implementationContract;

    constructor(address _implementation) {
        require(_implementation != address(0), "Invalid implementation");
        implementationContract = _implementation;
    }

    function createPublication(
        address[] memory _owners,
        uint256 _required,
        address _printer,
        string memory _config,
        string memory _html_root
    ) external returns (address) {
        require(_owners.length > 0 && _owners.length <= 10, "Invalid owner count");
        require(_required > 0 && _required <= _owners.length, "Invalid required count");
        require(_printer != address(0), "Invalid printer address");

        bytes32 salt = concatBytes16(_owners[0], _config);
        
        // Deploy ERC1967 Proxy
        bytes memory initData = abi.encodeWithSelector(
            NPublication(address(0)).initialize.selector,
            _owners,
            _required,
            _printer,
            _config,
            _html_root
        );

        address proxy = deployProxy(salt, implementationContract, initData);
        emit PublicationCreated(proxy, _owners, _required);
        return proxy;
    }

    function deployProxy(
        bytes32 salt,
        address implementation,
        bytes memory initData
    ) internal returns (address proxy) {
        bytes memory deploymentData = abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(implementation, initData)
        );

        assembly {
            proxy := create2(0, add(deploymentData, 0x20), mload(deploymentData), salt)
        }
        require(proxy != address(0), "Deployment failed");
    }

    function concatBytes16(address owner, string memory cid) public pure returns (bytes32 result) {
        bytes memory _cid = bytes(cid);
        bytes16 o = bytes16(bytes20(owner)); 
        bytes16 c = bytes16(_cid); 
    
        assembly {
            result := or(shl(128, o), c)
        }
    }
}
